"use client";

import { useCallback, useState } from "react";
import { FhevmInstance } from "../fhevmTypes";

export const useFHEPublicDecrypt = (params: {
  instance: FhevmInstance | undefined;
  chainId: number | undefined;
  handle: string | undefined;
}) => {
  const { instance, handle } = params;

  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [results, setResults] = useState<Awaited<ReturnType<FhevmInstance["publicDecrypt"]>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(async () => {
    if (!instance || !handle) {
      console.log("Missing instance or handle");
      return;
    }

    if (isDecrypting) {
      console.log("Already decrypting");
      return;
    }

    setIsDecrypting(true);
    setMessage("Decrypting...");
    setError(null);

    try {
      console.log("Calling publicDecrypt for handle:", handle);
      const res = await instance.publicDecrypt([handle]);
      console.log("Public decrypt results:", res);
      
      setResults(res);
      setMessage("Decryption completed");
    } catch (e) {
      console.error("Decryption error:", e);
      const err = e as any;
      const msg = err?.message || "Decryption failed";
      setError(msg);
      setMessage("Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, handle, isDecrypting]);

  return { decrypt, isDecrypting, message, results, error } as const;
};
