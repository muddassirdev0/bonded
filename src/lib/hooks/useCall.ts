import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface CallState {
    status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
    isAudio: boolean;
    isVideo: boolean;
    isMuted: boolean;
    isCameraOff: boolean;
    duration: number;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    error: string | null;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export function useCall(userId: string, remoteUserId: string) {
    const [callState, setCallState] = useState<CallState>({
        status: 'idle',
        isAudio: true,
        isVideo: false,
        isMuted: false,
        isCameraOff: false,
        duration: 0,
        remoteStream: null,
        localStream: null,
        error: null,
    });

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);
    const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const callIdRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
    };

    const setupPeerConnection = useCallback((stream: MediaStream) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
            setCallState(prev => ({
                ...prev,
                remoteStream: event.streams[0],
                status: 'connected'
            }));

            durationTimerRef.current = setInterval(() => {
                setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
            }, 1000);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: {
                        candidate: event.candidate.toJSON(),
                        from: userId
                    }
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                endCall();
            }
        };

        return pc;
    }, [userId]);

    const startCall = useCallback(async (withVideo: boolean = false) => {
        try {
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCallState(prev => ({ ...prev, error: 'Your browser does not support calling. Please use HTTPS or localhost.' }));
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: withVideo
            });
            localStreamRef.current = stream;

            setCallState(prev => ({
                ...prev,
                status: 'calling',
                isVideo: withVideo,
                isAudio: true,
                localStream: stream,
                duration: 0,
                error: null
            }));

            const pc = setupPeerConnection(stream);

            const channelName = `call-${[userId, remoteUserId].sort().join('-')}`;
            const channel = supabase.channel(channelName);
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'answer' }, async ({ payload }) => {
                    if (payload.from === remoteUserId && pc.signalingState !== 'closed') {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        } catch (e) {
                            console.error('Error setting remote description:', e);
                        }
                    }
                })
                .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                    if (payload.from === remoteUserId && pc.signalingState !== 'closed') {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } catch (e) {
                            console.error('Error adding ICE candidate:', e);
                        }
                    }
                })
                .on('broadcast', { event: 'call-rejected' }, () => {
                    endCall();
                })
                .on('broadcast', { event: 'call-ended' }, () => {
                    endCall();
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            channel.send({
                                type: 'broadcast',
                                event: 'offer',
                                payload: {
                                    offer: pc.localDescription?.toJSON(),
                                    from: userId,
                                    isVideo: withVideo
                                }
                            });
                        } catch (e) {
                            console.error('Error creating offer:', e);
                        }
                    }
                });

            // Log call start (don't block on this)
            supabase
                .from('call_logs')
                .insert({
                    caller_id: userId,
                    receiver_id: remoteUserId,
                    status: 'missed'
                })
                .select()
                .single()
                .then(({ data }) => {
                    if (data) callIdRef.current = data.id;
                });

        } catch (err: any) {
            console.error('Call error:', err);
            let errorMsg = 'Could not start call.';
            if (err.name === 'NotAllowedError') {
                errorMsg = 'Microphone/camera permission denied. Please allow access in browser settings.';
            } else if (err.name === 'NotFoundError') {
                errorMsg = 'No microphone/camera found on this device.';
            } else if (err.name === 'NotReadableError') {
                errorMsg = 'Microphone/camera is already in use by another app.';
            }
            setCallState(prev => ({ ...prev, error: errorMsg }));
        }
    }, [userId, remoteUserId, setupPeerConnection]);

    const answerCall = useCallback(async (offer: RTCSessionDescriptionInit, withVideo: boolean = false) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: withVideo
            });
            localStreamRef.current = stream;

            setCallState(prev => ({
                ...prev,
                status: 'connected',
                isVideo: withVideo,
                isAudio: true,
                localStream: stream,
                duration: 0,
                error: null
            }));

            const pc = setupPeerConnection(stream);
            const channelName = `call-${[userId, remoteUserId].sort().join('-')}`;
            const channel = supabase.channel(channelName);
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                    if (payload.from === remoteUserId && pc.signalingState !== 'closed') {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } catch (e) {
                            console.error('Error adding ICE candidate:', e);
                        }
                    }
                })
                .on('broadcast', { event: 'call-ended' }, () => {
                    endCall();
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);

                            channel.send({
                                type: 'broadcast',
                                event: 'answer',
                                payload: {
                                    answer: pc.localDescription?.toJSON(),
                                    from: userId
                                }
                            });
                        } catch (e) {
                            console.error('Error answering call:', e);
                        }
                    }
                });
        } catch (err: any) {
            console.error('Error answering call:', err);
            setCallState(prev => ({
                ...prev,
                error: 'Could not answer call. Check microphone/camera permissions.'
            }));
        }
    }, [userId, remoteUserId, setupPeerConnection]);

    const endCall = useCallback(async () => {
        const duration = callState.duration;

        // Notify remote
        if (channelRef.current) {
            try {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'call-ended',
                    payload: { from: userId }
                });
            } catch (e) { }
        }

        cleanup();

        // Update call log
        if (callIdRef.current) {
            await supabase
                .from('call_logs')
                .update({
                    status: duration > 0 ? 'completed' : 'missed',
                    duration: duration,
                    ended_at: new Date().toISOString()
                })
                .eq('id', callIdRef.current);
            callIdRef.current = null;
        }

        setCallState({
            status: 'ended',
            isAudio: false, isVideo: false,
            isMuted: false, isCameraOff: false,
            duration: 0, remoteStream: null,
            localStream: null, error: null,
        });

        setTimeout(() => {
            setCallState(prev => ({ ...prev, status: 'idle' }));
        }, 1500);
    }, [userId, callState.duration]);

    const toggleMute = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }, []);

    const toggleCamera = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setCallState(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }));
    }, []);

    const rejectCall = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'call-rejected',
                payload: { from: userId }
            });
        }
        cleanup();
        setCallState(prev => ({ ...prev, status: 'idle' }));
    }, [userId]);

    const clearError = useCallback(() => {
        setCallState(prev => ({ ...prev, error: null }));
    }, []);

    // Listen for incoming calls
    useEffect(() => {
        if (!userId || !remoteUserId) return;

        const channelName = `call-${[userId, remoteUserId].sort().join('-')}`;
        const incomingChannel = supabase.channel(`incoming-${channelName}`);

        incomingChannel
            .on('broadcast', { event: 'offer' }, ({ payload }) => {
                if (payload.from === remoteUserId && callState.status === 'idle') {
                    setCallState(prev => ({
                        ...prev,
                        status: 'ringing',
                        isVideo: payload.isVideo
                    }));
                    (window as any).__incomingOffer = payload.offer;
                    (window as any).__incomingIsVideo = payload.isVideo;
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(incomingChannel);
        };
    }, [userId, remoteUserId, callState.status]);

    return {
        callState,
        startCall,
        answerCall,
        endCall,
        toggleMute,
        toggleCamera,
        rejectCall,
        clearError
    };
}
