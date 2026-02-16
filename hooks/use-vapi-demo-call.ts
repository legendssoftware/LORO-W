"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Vapi from "@vapi-ai/web";
import { handleVapiError, retryVapiOperation } from "@/lib/utils/vapi-error-handler";
import { showErrorToast, showSuccessToast } from "@/lib/utils/toast-helpers";

const CALL_MAX_DURATION_MS =
  parseInt(process.env.NEXT_PUBLIC_MAX_CALL_DURATION_MINUTES ?? "5", 10) *
  60 *
  1000;
const WARNING_TIME_REMAINING_MS =
  parseInt(process.env.NEXT_PUBLIC_CALL_WARNING_SECONDS ?? "60", 10) * 1000;

/**
 * Hook for Vapi demo/support voice calls.
 * Provides start, end, retry and call state for the sidebar Support button.
 */
export function useVapiDemoCall() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallInitializing, setIsCallInitializing] = useState(false);
  const [demoVapi, setDemoVapi] = useState<Vapi | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const initAttemptedRef = useRef(false);
  const demoVapiRef = useRef<Vapi | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const formattedTimeRemaining = useMemo(() => {
    if (timeRemaining === null) return null;
    const totalSeconds = Math.ceil(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [timeRemaining]);

  const stopCallTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    setTimeRemaining(null);
    warningShownRef.current = false;
  }, []);

  const endDemoCall = useCallback(() => {
    const v = demoVapiRef.current;
    if (!v) return;
    if (!isCallActive) {
      setIsCallInitializing(false);
      return;
    }
    try {
      v.stop();
      stopCallTimer();
    } catch (error) {
      handleVapiError(error, toast, { silent: true });
      setIsCallActive(false);
      setIsCallInitializing(false);
      stopCallTimer();
    }
  }, [isCallActive, stopCallTimer]);

  const startCallTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    warningShownRef.current = false;
    callStartTimeRef.current = Date.now();
    setTimeRemaining(CALL_MAX_DURATION_MS);
    timerIntervalRef.current = setInterval(() => {
      if (!callStartTimeRef.current) return;
      const elapsed = Date.now() - callStartTimeRef.current;
      const remaining = Math.max(0, CALL_MAX_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= WARNING_TIME_REMAINING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast("1 minute remaining in your call", {
          duration: 4000,
          position: "bottom-center",
          icon: "⏱️",
        });
      }
      if (remaining <= 0) {
        toast("Call time limit reached (5 minutes)", {
          duration: 4000,
          position: "bottom-center",
          icon: "⏰",
        });
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        endDemoCall();
      }
    }, 1000);
  }, [endDemoCall]);

  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    const init = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_KEY;
        if (!apiKey) throw new Error("Vapi API key not defined");
        const vapi = new Vapi(apiKey);
        vapi.on("call-start", () => {
          setIsCallActive(true);
          setIsCallInitializing(false);
          setConnectionError(null);
          startCallTimer();
          showSuccessToast("Connected to Loro AI Assistant", toast);
        });
        vapi.on("call-end", () => {
          setIsCallActive(false);
          setConnectionError(null);
          stopCallTimer();
          showSuccessToast("Call ended. Thank you!", toast);
        });
        vapi.on("error", (error) => {
          setIsCallInitializing(false);
          setIsCallActive(false);
          stopCallTimer();
          setConnectionError(
            error instanceof Error ? error : new Error(String(error))
          );
          handleVapiError(error, toast);
        });
        demoVapiRef.current = vapi;
        setDemoVapi(vapi);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error : new Error(String(error))
        );
        handleVapiError(error, toast);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopCallTimer();
      const v = demoVapiRef.current;
      if (v) {
        try {
          v.stop();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [stopCallTimer]);

  const startDemoCall = useCallback(async () => {
    if (!demoVapi) {
      showErrorToast("Call feature not available", toast);
      return;
    }
    if (isCallActive) {
      toast("Call is already ongoing", {
        duration: 2000,
        position: "bottom-center",
        icon: "ℹ️",
      });
      return;
    }
    setIsCallInitializing(true);
    setConnectionError(null);
    showSuccessToast("Initiating call. Connecting...", toast);
    try {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      if (!assistantId) throw new Error("Assistant ID not found");
      await retryVapiOperation(
        () => demoVapi.start(assistantId),
        2,
        toast,
        { onRetry: () => setIsCallInitializing(true) }
      );
    } catch {
      setIsCallInitializing(false);
    }
  }, [demoVapi, isCallActive]);

  const retryDemoCall = useCallback(() => {
    if (isCallActive || isCallInitializing) return;
    setConnectionError(null);
    startDemoCall();
  }, [isCallActive, isCallInitializing, startDemoCall]);

  return {
    startDemoCall,
    endDemoCall,
    retryDemoCall,
    isCallActive,
    isCallInitializing,
    connectionError,
    formattedTimeRemaining,
  };
}
