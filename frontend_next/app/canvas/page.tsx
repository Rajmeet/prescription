"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/default-highlight';
import { Moon, Sun, Eraser, Pencil, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const colors = {
    darkBlue: '#3b82f6',
    red: '#ef4444',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
    pink: '#ec4899',
};

export default function Home() {
    const [content, setContent] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState(colors.darkBlue);
    const [isEraser, setIsEraser] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [paths, setPaths] = useState<{ color: string, points: { x: number, y: number }[] }[]>([]);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
            const resizeCanvas = () => {
                canvas.width = container.clientWidth;
                canvas.height = container.scrollHeight;
                redrawCanvas();
            };
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            container.addEventListener('scroll', redrawCanvas);
            return () => {
                window.removeEventListener('resize', resizeCanvas);
                container.removeEventListener('scroll', redrawCanvas);
            };
        }
    }, [content, paths]);

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const container = containerRef.current;
        if (canvas && ctx && container) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scrollTop = container.scrollTop;
            paths.forEach(path => {
                ctx.beginPath();
                ctx.strokeStyle = path.color === 'eraser' ? (isDarkMode ? '#1f2937' : 'white') : path.color;
                ctx.lineWidth = path.color === 'eraser' ? 20 : 2;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                path.points.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y - scrollTop);
                    } else {
                        ctx.lineTo(point.x, point.y - scrollTop);
                    }
                });
                ctx.stroke();
            });
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const rect = canvasRef.current?.getBoundingClientRect();
        const container = containerRef.current;
        if (rect && container) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top + container.scrollTop;
            setCurrentPath([{ x, y }]);
            drawLine([{ x, y }]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        const container = containerRef.current;
        if (rect && container) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top + container.scrollTop;
            setCurrentPath(prev => {
                const newPath = [...prev, { x, y }];
                drawLine(newPath);
                return newPath;
            });
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        if (currentPath.length > 0) {
            setPaths(prev => [...prev, { color: isEraser ? 'eraser' : currentColor, points: currentPath }]);
            setCurrentPath([]);
        }
    };

    const drawLine = (path: { x: number, y: number }[]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const container = containerRef.current;
        if (canvas && ctx && container) {
            ctx.beginPath();
            if (isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(255,255,255,1)';
                ctx.lineWidth = 20;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 2;
            }
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            const scrollTop = container.scrollTop;
            path.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y - scrollTop);
                } else {
                    ctx.lineTo(point.x, point.y - scrollTop);
                }
            });
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handleClearCanvas = () => {
        setPaths([]);
        redrawCanvas();
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleDownloadPDF = async () => {
        const element = containerRef.current;
        if (element) {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const elementHeight = element.scrollHeight;
            const pageCount = Math.ceil(elementHeight / pdfHeight);

            for (let i = 0; i < pageCount; i++) {
                const canvas = await html2canvas(element, {
                    y: i * pdfHeight,
                    height: pdfHeight,
                    windowHeight: pdfHeight,
                });
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save('preview.pdf');
        }
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
            <div className="container mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-4xl font-bold tracking-tight ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'} transition-colors duration-300 ease-in-out`}>
                        Prescription Notes
                    </h1>
                    <div className="flex space-x-2">
                        <Button onClick={handleDownloadPDF} variant="outline" className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-200'}`}>
                            <Download className="h-6 w-6" />
                        </Button>
                        <Button onClick={toggleDarkMode} variant="outline" className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-200'}`}>
                            {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>
                <div className="flex space-x-6">
                    <div className={`w-1/2 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <Textarea
                            placeholder="Enter Markdown content..."
                            value={content}
                            onChange={handleContentChange}
                            className={`w-full h-[calc(100vh-200px)] p-4 rounded-t-lg resize-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                                }`}
                        />
                    </div>
                    <div className={`w-1/2 rounded-lg shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div
                            ref={containerRef}
                            className="canvas-container relative"
                            style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}
                        >
                            <div className={`canvas-layer markdown-layer absolute inset-0 p-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                <div className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            code({ node, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const inline = node!.properties.inline || false
                                                const syntaxHighlighterRef = useRef<SyntaxHighlighter>(null)
                                                return !inline && match ? (
                                                    <SyntaxHighlighter
                                                        {...props}
                                                        children={String(children).replace(/\n$/, '')}
                                                        style={undefined}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        ref={syntaxHighlighterRef}
                                                    />
                                                ) : (
                                                    <code {...props} className={className}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            <canvas
                                ref={canvasRef}
                                className="canvas-layer drawing-layer absolute inset-0"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseOut={handleMouseUp}
                            />
                        </div>
                        <div className={`flex flex-wrap items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className="flex space-x-2">
                                <Button onClick={handleClearCanvas} className="bg-red-500 hover:bg-red-600 text-white">Clear Canvas</Button>
                                <Button
                                    onClick={() => setIsEraser(!isEraser)}
                                    variant={isEraser ? "secondary" : "outline"}
                                    className={`${isEraser ? 'bg-yellow-500 hover:bg-yellow-600' : isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} text-gray-900`}
                                >
                                    {isEraser ? <Eraser className="h-5 w-5 mr-2" /> : <Pencil className="h-5 w-5 mr-2" />}
                                    {isEraser ? "Eraser" : "Pencil"}
                                </Button>
                            </div>
                            <div className="flex flex-wrap">
                                {Object.entries({ ...colors, black: '#000000', white: '#FFFFFF' }).map(([name, color]) => (
                                    <div
                                        key={name}
                                        className={`color-button w-8 h-8 rounded-full mr-2 mb-2 cursor-pointer transition-all duration-200 ${color === currentColor ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setCurrentColor(color);
                                            setIsEraser(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}