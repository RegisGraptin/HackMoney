import { formatAmount } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge, Lock } from "lucide-react";
import { formatUnits } from "viem";

const DECIMALS = 6;
const PLACEHOLDER = "✶✶✶✶✶✶✶✶";

export function EncryptedBalance({
  tokenName,
  decryptedValue,
  displayDecimals = 2,
}: {
  tokenName: string;
  decryptedValue?: bigint;
  decimals?: number;
  displayDecimals?: number;
}) {

  return (
    <>
      <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
          <Lock className="h-4 w-4" />
          Encrypted {tokenName}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="relative overflow-hidden rounded-xl">
            <motion.p
              className="relative z-10 font-mono text-3xl font-semibold text-[#00FF94]"
              animate={{
                filter: decryptedValue !== undefined ? "blur(0px)" : "blur(8px)",
                opacity: decryptedValue !== undefined ? 1 : 0.8,
              }}
              transition={{ duration: 0.4 }}
            >
              {decryptedValue !== undefined
                ? formatAmount(formatUnits(decryptedValue, DECIMALS), {
                    minimumFractionDigits: displayDecimals,
                    maximumFractionDigits: displayDecimals,
                  })
                : PLACEHOLDER}
            </motion.p>
            {!decryptedValue && (
              <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0.24, 0.36, 0.28, 0.4, 0.3] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(0,255,148,0.08), transparent 35%), radial-gradient(circle at 80% 60%, rgba(0,255,148,0.06), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 4px)",
                }}
              />
            )}
          </div>
          <Badge>{tokenName}</Badge>
        </div>
      </div>
    </>
  );
}
