import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings2, Image as ImageIcon, FileText, Palette, Type, Play, Pause, Video, Circle, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const CHAR_LIST_SIMPLE = '@%#*+=-:. ';
const CHAR_LIST_COMPLEX = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

// Fixes missing escape sequences. Let's make sure it's exactly the same.
// Python: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,\"^`'. "

export default function App() {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'simple' | 'complex'>('complex');
  const cols = 150; // Locked resolution
  const [bgCode, setBgCode] = useState<'black' | 'white'>('black');
  const [isColor, setIsColor] = useState<boolean>(false);
  const [outlineWidth, setOutlineWidth] = useState<number>(0);
  const [isHollow, setIsHollow] = useState<boolean>(false);
  const [contrast, setContrast] = useState<number>(1.2);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textPreRef = useRef<HTMLPreElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith('video/')) {
        setMediaType('video');
    } else {
        setMediaType('image');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!mediaSrc) return;
    if (mediaType === 'image') {
       processFrame(true);
    } else if (mediaType === 'video' && videoRef.current) {
       if (videoRef.current.paused) {
           processFrame(true);
       }
    }
  }, [mediaSrc, mediaType, mode, bgCode, isColor, outlineWidth, isHollow, contrast, brightness]);

  const togglePlay = () => {
      if (!videoRef.current || mediaType !== 'video') return;
      if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  };

  const processFrame = async (isStatic = false) => {
    if (!mediaSrc) return;
    if (isStatic) setIsProcessing(true);
    
    let sourceElement: HTMLImageElement | HTMLVideoElement;
    let width = 0;
    let height = 0;

    if (mediaType === 'image') {
        sourceElement = new Image();
        sourceElement.src = mediaSrc;
        await new Promise((resolve) => (sourceElement.onload = resolve));
        width = sourceElement.width;
        height = sourceElement.height;
    } else {
        if (!videoRef.current) {
            if (isStatic) setIsProcessing(false);
            return;
        }
        sourceElement = videoRef.current;
        width = (sourceElement as HTMLVideoElement).videoWidth || 640;
        height = (sourceElement as HTMLVideoElement).videoHeight || 360;
        // if video hasn't loaded dimensions yet
        if (width === 0) {
            if(isStatic) setIsProcessing(false);
            return; 
        }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        if (isStatic) setIsProcessing(false);
        return;
    }

    // We process the original image dimensions
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(sourceElement, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let numCols = cols;
    const cellWidth = width / numCols;
    // Scale usually 2 for text, because characters are typically 2x taller than they are wide.
    const cellHeight = 2 * cellWidth; 
    let numRows = Math.floor(height / cellHeight);

    // Failsafe similar to python code
    if (numCols > width || numRows > height) {
      const fixedCellW = 6;
      const fixedCellH = 12;
      numCols = Math.floor(width / fixedCellW);
      numRows = Math.floor(height / fixedCellH);
    }

    const charList = mode === 'simple' ? CHAR_LIST_SIMPLE : CHAR_LIST_COMPLEX;
    const numChars = charList.length;

    let textOutput = '';
    let htmlOutput = '';
    const colorBlocks: { char: string, color: string }[][] = [];

    const escapeHtml = (char: string) => {
        switch(char) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            // Spaces are tricky in HTML elements unless inside a <pre>, but &nbsp; is safe
            default: return char;
        }
    };

    for (let i = 0; i < numRows; i++) {
        const rowBlocks: { char: string, color: string }[] = [];
      for (let j = 0; j < numCols; j++) {
        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;

        const startY = Math.floor(i * cellHeight);
        const endY = Math.min(Math.floor((i + 1) * cellHeight), height);
        const startX = Math.floor(j * cellWidth);
        const endX = Math.min(Math.floor((j + 1) * cellWidth), width);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count++;
          }
        }

        if (count === 0) continue;

        const r = rSum / count;
        const g = gSum / count;
        const b = bSum / count;
        
        // Perceptual luminance (Rec. 709) for more accurate human-eye representation
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        // Apply brightness and contrast
        const adjustedGray = Math.max(0, Math.min(255, ((gray * brightness) - 128) * contrast + 128));
        
        // Match the python character selection
        let charIdx = Math.min(Math.floor((adjustedGray * numChars) / 255), numChars - 1);
        
        // IMPORTANT: When background is black, drawing heavy characters for dark regions emulates light.
        // We must invert the mapping so dark image regions map to empty spaces (which are dark on a black bg).
        if (bgCode === 'black') {
            charIdx = numChars - 1 - charIdx;
        }
        
        const char = charList[charIdx];
        const color = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        
        textOutput += char;
        if (isColor) {
            htmlOutput += `<span style="color: ${color}">${escapeHtml(char)}</span>`;
        } else {
            htmlOutput += escapeHtml(char);
        }
        
        rowBlocks.push({ char, color });
      }
      textOutput += '\n';
      htmlOutput += '\n';
      colorBlocks.push(rowBlocks);
    }

    // Directly update refs instead of state to prevent massive UI lag for videos
    if (textPreRef.current) {
        textPreRef.current.innerText = textOutput;
        if (isColor) {
            textPreRef.current.innerHTML = htmlOutput;
        }
    }

    // Draw to result canvas
    const resCanvas = resultCanvasRef.current;
    if (!resCanvas) {
        if (isStatic) setIsProcessing(false);
        return;
    }
    const resCtx = resCanvas.getContext('2d', { willReadFrequently: true });
    if (!resCtx) {
        if (isStatic) setIsProcessing(false);
        return;
    }

    // Determine font and size
    const charWidth = 6; // approximate pixels per char
    const charHeight = 12;
    const targetW = charWidth * numCols;
    const targetH = charHeight * numRows;
    
    if (resCanvas.width !== targetW) resCanvas.width = targetW;
    if (resCanvas.height !== targetH) resCanvas.height = targetH;
    
    resCtx.fillStyle = bgCode === 'white' ? '#ffffff' : '#000000';
    resCtx.fillRect(0, 0, resCanvas.width, resCanvas.height);
    
    resCtx.textBaseline = 'top';
    // Match a monospace font
    resCtx.font = '12px "Courier New", Courier, monospace';
    resCtx.lineJoin = 'round'; // Softer outline strokes

    for (let MathI = 0; MathI < numRows; MathI++) {
        for (let MathJ = 0; MathJ < numCols; MathJ++) {
            const block = colorBlocks[MathI][MathJ];
            const x = MathJ * charWidth;
            const y = MathI * charHeight;
            
            const textColor = isColor ? block.color : (bgCode === 'white' ? '#000000' : '#ffffff');
            
            if (outlineWidth > 0) {
                resCtx.lineWidth = outlineWidth;
                resCtx.strokeStyle = textColor;
                resCtx.strokeText(block.char, x, y);
            }
            
            if (!isHollow || outlineWidth === 0) {
                resCtx.fillStyle = textColor;
                resCtx.fillText(block.char, x, y);
            }
        }
    }

    if (isStatic) setIsProcessing(false);
  };

  const renderLoop = () => {
    if (mediaType === 'video' && videoRef.current && !videoRef.current.paused) {
         processFrame(false).then(() => {
             // 1000ms / 600fps ≈ 1.6ms per frame
             reqRef.current = window.setTimeout(renderLoop, 1000 / 600);
         });
    }
  };

  const onVideoPlay = () => {
      setIsPlaying(true);
      reqRef.current = window.setTimeout(renderLoop, 1000 / 600);
  };

  const onVideoPause = () => {
      setIsPlaying(false);
      if (reqRef.current) window.clearTimeout(reqRef.current);
  };

  const startRecording = () => {
    if (!resultCanvasRef.current || !videoRef.current) return;
    recordedChunksRef.current = [];
    const stream = resultCanvasRef.current.captureStream(600);
    const options = { mimeType: 'video/webm' };
    
    let recorder: MediaRecorder;
    try {
        recorder = new MediaRecorder(stream, options);
    } catch (e) {
        recorder = new MediaRecorder(stream); // Fallback to browser default
    }
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'ascii_video.webm';
      a.click();
      window.URL.revokeObjectURL(url);
      setIsRecording(false);
    };
    
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    
    // Play video from start
    videoRef.current.currentTime = 0;
    videoRef.current.play();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (videoRef.current) {
        videoRef.current.pause();
    }
  };

  const onVideoEnded = () => {
      if (isRecording) {
          stopRecording();
      }
  };

  const handleDownload = () => {
    if (!resultCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'ascii_art.png';
    link.href = resultCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleDownloadText = () => {
    if (!textPreRef.current) return;
    
    let content = '';
    let ext = 'txt';
    let mime = 'text/plain';

    if (isColor) {
      // Export colored version as HTML so the visual output perfectly matches the app's browser view
      ext = 'html';
      mime = 'text/html';
      
      let strokeStyle = '';
      if (outlineWidth > 0) {
          strokeStyle = `
    -webkit-text-stroke-width: ${outlineWidth}px;
    -webkit-text-stroke-color: currentColor;
    ${isHollow ? '-webkit-text-fill-color: transparent;' : ''}`;
      }
      
      content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Colored ASCII Art</title>
<style>
  body {
    background-color: ${bgCode === 'white' ? '#ffffff' : '#000000'};
    color: ${bgCode === 'white' ? '#000000' : '#ffffff'};
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 10px;
    line-height: 10px;
    margin: 0;
    padding: 20px;
    ${strokeStyle}
  }
</style>
</head>
<body>
<pre>${textPreRef.current.innerHTML}</pre>
</body>
</html>`;
    } else {
      content = textPreRef.current.innerText;
    }

    const blob = new Blob([content], { type: mime });
    const link = document.createElement('a');
    link.download = `ascii_art.${ext}`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 md:p-12 font-sans selection:bg-neutral-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Type className="w-8 h-8 text-neutral-400" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-white">
              ASCII Canvas
            </h1>
          </div>
          <p className="text-neutral-300 text-lg max-w-2xl font-light">
             Sculpt light, shadow, and code into mesmerizing ASCII symphonies. Your browser-native atelier.
          </p>
          <blockquote className="mt-4 italic text-neutral-500 font-serif border-l-2 border-neutral-700 pl-4">
            "To paint with characters is to distill the image into its fundamental soul, weaving light from the quiet geometry of code, where every pixel is a whisper, and every whisper, a masterpiece."
          </blockquote>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader>
                <CardTitle className="text-lg">Image Source</CardTitle>
                <CardDescription className="text-neutral-400">Upload an image to start converting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  accept="image/*,video/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageUpload}
                />
                
                {mediaSrc && mediaType === 'image' && (
                    <div className="rounded-md overflow-hidden bg-black border border-neutral-800 flex justify-center">
                        <img src={mediaSrc} alt="Source" className="w-full h-auto object-contain max-h-48" />
                    </div>
                )}

                {mediaSrc && mediaType === 'video' && (
                    <div className="rounded-md overflow-hidden bg-black border border-neutral-800 flex flex-col justify-center relative group">
                        <video 
                            ref={videoRef} 
                            src={mediaSrc} 
                            className="w-full h-auto object-contain max-h-48 cursor-pointer"
                            loop={!isRecording}
                            muted
                            playsInline
                            onPlay={onVideoPlay}
                            onPause={onVideoPause}
                            onClick={togglePlay}
                            onSeeked={() => processFrame(true)}
                            onLoadedData={() => processFrame(true)}
                            onEnded={onVideoEnded}
                        />
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                           <div className="bg-black/60 rounded-full p-4 backdrop-blur-sm shadow-xl">
                                <Play className="w-8 h-8 text-white fill-white" />
                           </div>
                        </div>
                    </div>
                )}
                
                <Button 
                    variant="outline" 
                    className={`w-full border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 bg-neutral-900/50 text-neutral-400 transition-colors ${!mediaSrc ? 'h-32 flex-col' : 'h-10'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className={`${!mediaSrc ? 'w-6 h-6 mb-2' : 'w-4 h-4 mr-2'}`} />
                    <span>{mediaSrc ? "Upload Another File" : "Click or drag image/video"}</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-neutral-400" />
                    Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3 opacity-60">
                    <div className="flex justify-between">
                        <Label>Resolution (Columns)</Label>
                        <span className="text-xs text-neutral-400 font-mono">150 (Locked)</span>
                    </div>
                    <Slider
                        disabled
                        value={[150]}
                        min={50}
                        max={400}
                        step={10}
                        className="[&>span:first-child]:bg-neutral-800"
                    />
                </div>

                <div className="space-y-3">
                    <Label>Character Set</Label>
                    <Select value={mode} onValueChange={(val: 'simple'|'complex') => setMode(val)}>
                        <SelectTrigger className="bg-neutral-950 border-neutral-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                            <SelectItem value="simple">Simple (10 characters)</SelectItem>
                            <SelectItem value="complex">Complex (70 characters)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>Background Color</Label>
                    <Select value={bgCode} onValueChange={(val: 'black'|'white') => setBgCode(val)}>
                        <SelectTrigger className="bg-neutral-950 border-neutral-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                            <SelectItem value="black">Dark</SelectItem>
                            <SelectItem value="white">Light</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between pt-2 pb-2">
                    <div className="space-y-0.5">
                        <Label>Colored Text</Label>
                        <p className="text-xs text-neutral-400">Match original image colors</p>
                    </div>
                    <Switch checked={isColor} onCheckedChange={setIsColor} />
                </div>
                
                <div className="space-y-3 pt-4 border-t border-neutral-800">
                    <div className="flex justify-between">
                        <Label>Brightness</Label>
                        <span className="text-xs text-neutral-400 font-mono">{brightness}x</span>
                    </div>
                    <Slider
                        value={[brightness]}
                        onValueChange={(val: any) => setBrightness(Array.isArray(val) ? val[0] : val)}
                        min={0.5} max={2.0} step={0.1}
                        className="[&>span:first-child]:bg-neutral-800"
                    />

                    <div className="flex justify-between pt-2">
                        <Label>Contrast</Label>
                        <span className="text-xs text-neutral-400 font-mono">{contrast}x</span>
                    </div>
                    <Slider
                        value={[contrast]}
                        onValueChange={(val: any) => setContrast(Array.isArray(val) ? val[0] : val)}
                        min={0.5} max={3.0} step={0.1}
                        className="[&>span:first-child]:bg-neutral-800"
                    />
                </div>

                <div className="space-y-3 pb-2">
                    <div className="flex justify-between">
                        <Label>Outline Weight</Label>
                        <span className="text-xs text-neutral-400 font-mono">{outlineWidth}px</span>
                    </div>
                    <Slider
                        value={[outlineWidth]}
                        onValueChange={(val: any) => setOutlineWidth(Array.isArray(val) ? val[0] : val)}
                        min={0} max={2.0} step={0.2}
                        className="[&>span:first-child]:bg-neutral-800"
                    />
                    <div className="flex items-center justify-between pt-1">
                        <div className="space-y-0.5">
                            <Label>Hollow Text</Label>
                            <p className="text-xs text-neutral-400">Only draw outlines</p>
                        </div>
                        <Switch checked={isHollow} onCheckedChange={setIsHollow} disabled={outlineWidth === 0} />
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 flex-1 flex flex-col overflow-hidden">
                <Tabs defaultValue="text" className="flex-1 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-neutral-800/50">
                        <TabsList className="bg-neutral-950 border border-neutral-800">
                            <TabsTrigger value="image" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                                {mediaType === 'video' ? <Video className="w-4 h-4 mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />} 
                                {mediaType === 'video' ? 'Video' : 'Image'}
                            </TabsTrigger>
                            <TabsTrigger value="text" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                                <FileText className="w-4 h-4 mr-2" /> Text
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800" onClick={handleDownloadText}>
                                <FileText className="w-4 h-4 mr-2" /> Text
                            </Button>
                            {mediaType === 'video' ? (
                                isRecording ? (
                                    <Button size="sm" variant="destructive" onClick={stopRecording}>
                                        <Square className="w-4 h-4 mr-2 fill-current" /> Stop Recording
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="default" className="bg-red-600 hover:bg-red-700 text-white" onClick={startRecording}>
                                        <Circle className="w-4 h-4 mr-2 fill-white" /> Record Video
                                    </Button>
                                )
                            ) : (
                                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDownload}>
                                    <Download className="w-4 h-4 mr-2" /> Image
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 p-0 relative min-h-0 bg-neutral-950 overflow-hidden">
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                <div className="text-white animate-pulse font-mono">Processing...</div>
                            </div>
                        )}
                        {!mediaSrc && (
                            <div className="absolute inset-0 flex items-center justify-center text-neutral-600 font-mono text-sm">
                                No file loaded
                            </div>
                        )}
                        
                        <TabsContent value="image" className="m-0 h-full w-full data-[state=active]:flex items-center justify-center overflow-auto p-4">
                            <canvas 
                                ref={resultCanvasRef}
                                className={`max-w-full max-h-full object-contain shadow-2xl rounded ${!mediaSrc ? 'hidden' : ''}`}
                            />
                        </TabsContent>
                        
                        <TabsContent value="text" className="m-0 h-[600px] w-full data-[state=active]:block overflow-auto p-4 custom-scrollbar">
                           <pre 
                               ref={textPreRef}
                               className="font-mono text-[8px] leading-[8px] sm:text-[10px] sm:leading-[10px] m-0 p-0 transition-opacity"
                               style={{
                                   color: bgCode === 'white' ? '#000' : '#fff',
                                   WebkitTextStrokeWidth: outlineWidth > 0 ? `${outlineWidth}px` : undefined,
                                   WebkitTextStrokeColor: outlineWidth > 0 ? (isColor ? undefined : 'currentcolor') : undefined,
                                   WebkitTextFillColor: isHollow && outlineWidth > 0 ? 'transparent' : undefined,
                               }}
                           />
                        </TabsContent>

                    </CardContent>
                </Tabs>
            </Card>
          </div>
        </div>

        <footer className="pt-12 pb-6 flex justify-center border-t border-neutral-900">
          <p className="text-neutral-500 text-sm font-mono">
            Crafted with passion by <a href="https://www.linkedin.com/in/rehan-ahmad-863386382?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white transition-colors underline decoration-neutral-700">Rehan97</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

