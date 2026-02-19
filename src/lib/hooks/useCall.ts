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
    const statusRef = useRef(callState.status);

    // Keep status ref up to date
    useEffect(() => {
        statusRef.current = callState.status;
    }, [callState.status]);

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

            // Update call log to connected
            if (callIdRef.current) {
                supabase.from('call_logs').update({ status: 'completed' }).eq('id', callIdRef.current);
            }

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

    const getChannel = useCallback(() => {
        const channelName = `call-${[userId, remoteUserId].sort().join('-')}`;
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }
        const channel = supabase.channel(channelName, {
            config: { broadcast: { self: false } }
        });
        channelRef.current = channel;
        return channel;
    }, [userId, remoteUserId]);

    const startCall = useCallback(async (withVideo: boolean = false) => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCallState(prev => ({ ...prev, error: 'Your browser does not support calling. Use HTTPS or localhost.' }));
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
            const channel = getChannel();

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

                            // Send offer on the channel
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

            // Log call
            supabase
                .from('call_logs')
                .insert({ caller_id: userId, receiver_id: remoteUserId, status: 'missed' })
                .select().single()
                .then(({ data }) => { if (data) callIdRef.current = data.id; });

        } catch (err: any) {
            console.error('Call error:', err);
            let errorMsg = 'Could not start call.';
            if (err.name === 'NotAllowedError') errorMsg = 'Microphone/camera permission denied. Allow access in browser settings.';
            else if (err.name === 'NotFoundError') errorMsg = 'No microphone/camera found on this device.';
            else if (err.name === 'NotReadableError') errorMsg = 'Microphone/camera in use by another app.';
            setCallState(prev => ({ ...prev, error: errorMsg }));
        }
    }, [userId, remoteUserId, setupPeerConnection, getChannel]);

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
            const channel = getChannel();

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
                error: 'Could not answer call. Check microphone/camera permissions.',
                status: 'idle'
            }));
        }
    }, [userId, remoteUserId, setupPeerConnection, getChannel]);

    const endCall = useCallback(async () => {
        const duration = callState.duration;

        if (channelRef.current) {
            try {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'call-ended',
                    payload: { from: userId }
                });
            } catch (e) { }
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        cleanup();

        if (callIdRef.current) {
            await supabase
                .from('call_logs')
                .update({
                    status: duration > 0 ? 'completed' : 'missed',
                    duration,
                    ended_at: new Date().toISOString()
                })
                .eq('id', callIdRef.current);
            callIdRef.current = null;
        }

        setCallState({
            status: 'ended', isAudio: false, isVideo: false,
            isMuted: false, isCameraOff: false, duration: 0,
            remoteStream: null, localStream: null, error: null,
        });

        setTimeout(() => {
            setCallState(prev => ({ ...prev, status: 'idle' }));
        }, 1500);
    }, [userId, callState.duration]);

    const toggleMute = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }, []);

    const toggleCamera = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
        setCallState(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }));
    }, []);

    const rejectCall = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'call-rejected',
                payload: { from: userId }
            });
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        cleanup();
        setCallState(prev => ({ ...prev, status: 'idle' }));
    }, [userId]);

    const clearError = useCallback(() => {
        setCallState(prev => ({ ...prev, error: null }));
    }, []);

    // ===== INCOMING CALL LISTENER =====
    // This listens on the SAME channel the caller sends on
    useEffect(() => {
        if (!userId || !remoteUserId) return;

        const channelName = `call-${[userId, remoteUserId].sort().join('-')}`;
        const listenChannel = supabase.channel(channelName, {
            config: { broadcast: { self: false } }
        });
        channelRef.current = listenChannel;

        listenChannel
            .on('broadcast', { event: 'offer' }, ({ payload }) => {
                if (payload.from === remoteUserId && statusRef.current === 'idle') {
                    setCallState(prev => ({
                        ...prev,
                        status: 'ringing',
                        isVideo: payload.isVideo
                    }));
                    // Store offer for answering
                    (window as any).__incomingOffer = payload.offer;
                    (window as any).__incomingIsVideo = payload.isVideo;
                }
            })
            .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
                if (payload.from === remoteUserId) {
                    cleanup();
                    setCallState(prev => ({ ...prev, status: 'idle' }));
                }
            })
            .on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
                if (payload.from === remoteUserId) {
                    cleanup();
                    setCallState(prev => ({ ...prev, status: 'idle' }));
                }
            })
            .subscribe();

        return () => {
            // Only remove if we still own it
            if (channelRef.current === listenChannel) {
                supabase.removeChannel(listenChannel);
                channelRef.current = null;
            }
        };
    }, [userId, remoteUserId]);

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
