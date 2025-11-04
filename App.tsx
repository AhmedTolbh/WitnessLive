import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAI_Blob, FunctionDeclaration, Type } from '@google/genai';
import { decode, encode, decodeAudioData } from './utils/audio';
import { TranscriptEntry, Citation } from './types';
import Icon from './components/Icon';
import LinkifiedText from './components/LinkifiedText';

const FRAME_RATE = 2; // fps
const JPEG_QUALITY = 0.7;
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

// Function Declaration for the AI to call
const showClickMarkerDeclaration: FunctionDeclaration = {
    name: 'showClickMarker',
    description: 'Displays a marker on the screen to show the user where to click. Use this to point to UI elements.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            x: {
                type: Type.NUMBER,
                description: 'The normalized horizontal coordinate (from 0.0 to 1.0), where 0.0 is the far left of the screen.',
            },
            y: {
                type: Type.NUMBER,
                description: 'The normalized vertical coordinate (from 0.0 to 1.0), where 0.0 is the very top of the screen.',
            },
        },
        required: ['x', 'y'],
    },
};


const App: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('Ready to assist. Click "Start Session" to begin.');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);

    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const outputAudioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextAudioStartTime = useRef<number>(0);
    
    const currentInputTranscript = useRef<string>("");
    const currentOutputTranscript = useRef<string>("");

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent) {
            const { inputTranscription, outputTranscription, modelTurn, turnComplete, groundingMetadata } = message.serverContent;
            
            if (inputTranscription) {
                currentInputTranscript.current += inputTranscription.text;
                setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.source === 'user' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentInputTranscript.current }];
                    }
                    return [...prev, { id: Date.now(), source: 'user', text: currentInputTranscript.current, isFinal: false }];
                });
            }

            if (outputTranscription) {
                currentOutputTranscript.current += outputTranscription.text;
                setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.source === 'ai' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentOutputTranscript.current }];
                    }
                    return [...prev, { id: Date.now() + 1, source: 'ai', text: currentOutputTranscript.current, isFinal: false }];
                });
            }
            
            if (groundingMetadata?.groundingChunks) {
                const citations: Citation[] = groundingMetadata.groundingChunks
                    .filter(chunk => chunk.web)
                    .map(chunk => ({
                        uri: chunk.web.uri,
                        title: chunk.web.title,
                    }));

                if (citations.length > 0) {
                     setTranscripts(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.source === 'ai') {
                            const existingCitations = last.citations || [];
                            const newCitations = citations.filter(c => !existingCitations.some(ec => ec.uri === c.uri));
                            if (newCitations.length > 0) {
                                return [...prev.slice(0, -1), { ...last, citations: [...existingCitations, ...newCitations] }];
                            }
                        }
                        return prev;
                    });
                }
            }

            if (modelTurn?.parts[0]?.inlineData?.data) {
                const audioData = modelTurn.parts[0].inlineData.data;
                if (!outputAudioContextRef.current) {
                    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
                }
                const ctx = outputAudioContextRef.current;
                
                nextAudioStartTime.current = Math.max(nextAudioStartTime.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.addEventListener('ended', () => {
                    outputAudioSources.current.delete(source);
                });

                source.start(nextAudioStartTime.current);
                nextAudioStartTime.current += audioBuffer.duration;
                outputAudioSources.current.add(source);
            }

            if (turnComplete) {
                setTranscripts(prev => prev.map(t => ({...t, isFinal: true })));
                currentInputTranscript.current = "";
                currentOutputTranscript.current = "";
            }
        }
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'showClickMarker') {
                    const { x, y } = fc.args;

                    if (typeof x === 'number' && typeof y === 'number' && videoRef.current && videoContainerRef.current) {
                        const videoRect = videoRef.current.getBoundingClientRect();
                        const containerRect = videoContainerRef.current.getBoundingClientRect();

                        const markerX = (videoRect.left - containerRect.left) + x * videoRect.width;
                        const markerY = (videoRect.top - containerRect.top) + y * videoRect.height;
                        
                        setMarker({ x: markerX, y: markerY });

                        setTimeout(() => {
                            setMarker(null);
                        }, 4000); // Marker disappears after 4 seconds
                    }

                    sessionPromiseRef.current?.then((session) => {
                        session.sendToolResponse({
                            functionResponses: {
                                id : fc.id,
                                name: fc.name,
                                response: { result: "ok, marker shown" },
                            }
                        });
                    });
                }
            }
        }
    }, []);
    
    const handleStopSession = useCallback(async () => {
        setIsSessionActive(false);
        setStatusMessage('Session ended. Click "Start Session" to begin again.');
        setMarker(null);
        
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (error) {
                console.error("Error closing session:", error);
            } finally {
                sessionPromiseRef.current = null;
            }
        }
        
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
            outputAudioContextRef.current = null;
        }
        outputAudioSources.current.forEach(source => source.stop());
        outputAudioSources.current.clear();
        nextAudioStartTime.current = 0;
        
    }, []);

    const startLiveSession = useCallback(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        return ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => setStatusMessage('Connection opened. AI is listening...'),
                onmessage: handleMessage,
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setStatusMessage(`Error: ${e.message}. Please try again.`);
                    handleStopSession();
                },
                onclose: (e: CloseEvent) => {
                    setStatusMessage('Session closed.');
                    handleStopSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                tools: [
                    { functionDeclarations: [showClickMarkerDeclaration] },
                    { googleSearch: {} }
                ],
                systemInstruction: 'You are a helpful AI assistant. Analyze the user\'s screen and voice to help them solve technical problems with code, applications, or general computer issues. Use Google Search to find documentation or recent information when needed. If the user provides a URL and asks you to analyze it, use Google Search with the `site:` operator to search within that specific URL or domain to find relevant information and answer their question. When the user asks where to click or what to look at, use the `showClickMarker` tool to point to the exact location on the screen. Be concise and clear in your spoken responses.',
            },
        });
    }, [handleMessage, handleStopSession]);


    const handleStartSession = async () => {
        if (isSessionActive) return;
        
        setTranscripts([]);
        setStatusMessage('Requesting permissions...');

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: FRAME_RATE },
                audio: false,
            });
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const combinedStream = new MediaStream([...displayStream.getTracks(), ...audioStream.getTracks()]);
            mediaStreamRef.current = combinedStream;

            if (videoRef.current) {
                videoRef.current.srcObject = displayStream;
                videoRef.current.muted = true;
                videoRef.current.play().catch(console.error);
            }
            
            displayStream.getVideoTracks()[0].onended = () => {
                handleStopSession();
            };

            setIsSessionActive(true);
            setStatusMessage('Initializing AI session...');
            
            sessionPromiseRef.current = startLiveSession();

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            const audioCtx = inputAudioContextRef.current;
            scriptProcessorRef.current = audioCtx.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
            mediaStreamSourceRef.current = audioCtx.createMediaStreamSource(audioStream);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                
                // Convert Float32Array to Int16Array for 16-bit PCM audio
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    // The API expects 16-bit PCM audio, so we convert the float samples.
                    int16[i] = inputData[i] * 32768;
                }

                const pcmBlob: GenAI_Blob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                };

                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    }).catch(err => {
                        console.error("Failed to send audio data:", err);
                        handleStopSession();
                    });
                }
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioCtx.destination);
            
            frameIntervalRef.current = window.setInterval(() => {
                if (videoRef.current && canvasRef.current && sessionPromiseRef.current) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const base64Data = (reader.result as string).split(',')[1];
                                    if(sessionPromiseRef.current) {
                                        sessionPromiseRef.current.then((session) => {
                                            session.sendRealtimeInput({
                                                media: { data: base64Data, mimeType: 'image/jpeg' }
                                            });
                                        }).catch(err => {
                                            console.error("Failed to send video frame:", err);
                                            handleStopSession();
                                        });
                                    }
                                };
                                reader.readAsDataURL(blob);
                            }
                        },
                        'image/jpeg',
                        JPEG_QUALITY
                    );
                }
            }, 1000 / FRAME_RATE);

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatusMessage('Failed to get permissions. Please allow screen and microphone access.');
            setIsSessionActive(false);
            handleStopSession();
        }
    };
    
    useEffect(() => {
        return () => {
            handleStopSession();
        };
    }, [handleStopSession]);


    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans">
            <header className="sticky top-0 z-10 bg-slate-900/70 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Icon type="witness" className="w-8 h-8 text-purple-400" />
                    <h1 className="text-2xl font-bold tracking-wider">WitnessLive</h1>
                </div>
                 <div className="flex items-center space-x-4">
                    <p className="text-sm text-slate-400 hidden md:block">{statusMessage}</p>
                    {!isSessionActive ? (
                        <button onClick={handleStartSession} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/20">
                            <Icon type="screen" className="w-5 h-5" />
                            <span>Start Session</span>
                        </button>
                    ) : (
                        <button onClick={handleStopSession} className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-rose-500/20">
                           <Icon type="stop" className="w-5 h-5" />
                           <span>Stop Session</span>
                        </button>
                    )}
                 </div>
            </header>
            
            <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
                <div className="flex-1 flex flex-col bg-slate-800/50 rounded-lg shadow-2xl shadow-slate-950/50 overflow-hidden">
                    <div className="bg-slate-700/50 p-3 text-center font-semibold tracking-wide">Live Feed</div>
                    <div ref={videoContainerRef} className={`flex-1 flex items-center justify-center p-2 bg-black relative rounded-b-lg transition-all duration-300 ${isSessionActive ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : 'ring-1 ring-slate-700'}`}>
                        <video ref={videoRef} className="max-h-full max-w-full" />
                        <canvas ref={canvasRef} className="hidden" />
                        {!isSessionActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
                                <Icon type="screen" className="w-24 h-24 text-slate-600" />
                                <p className="mt-4 text-slate-400">Your screen share will appear here.</p>
                            </div>
                        )}
                        {marker && (
                            <div 
                                className="marker" 
                                style={{ 
                                    left: `${marker.x}px`, 
                                    top: `${marker.y}px` 
                                }} 
                            />
                        )}
                    </div>
                </div>

                <div className="w-full md:w-1/3 flex flex-col bg-slate-800/50 rounded-lg shadow-2xl shadow-slate-950/50">
                    <div className="bg-slate-700/50 p-3 text-center font-semibold tracking-wide">Live Transcription</div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {transcripts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Icon type="mic-off" className="w-16 h-16" />
                                <p className="mt-2">The conversation will appear here live.</p>
                            </div>
                        )}
                        {transcripts.map((entry) => (
                            <div key={entry.id} className={`flex items-start gap-3 animate-fade-in ${entry.source === 'user' ? 'justify-end' : ''}`}>
                                {entry.source === 'ai' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-md">
                                        <Icon type="witness" className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-xs lg:max-w-sm xl:max-w-md p-3 rounded-lg shadow-sm ${entry.source === 'user' ? 'bg-slate-600' : 'bg-slate-700'}`}>
                                    <p className={`whitespace-pre-wrap ${!entry.isFinal ? 'opacity-70' : ''}`}>
                                        <LinkifiedText>{entry.text}</LinkifiedText>
                                    </p>
                                    {entry.citations && entry.citations.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
                                            <h4 className="text-xs font-semibold text-slate-400">Sources:</h4>
                                            <ul className="space-y-1">
                                                {entry.citations.map((citation, index) => (
                                                    <li key={index} className="truncate">
                                                        <a
                                                            href={citation.uri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-purple-400 hover:text-purple-300 hover:underline"
                                                            title={citation.uri}
                                                        >
                                                            {citation.title || citation.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {entry.source === 'user' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center shadow-md">
                                        <Icon type="user" className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
