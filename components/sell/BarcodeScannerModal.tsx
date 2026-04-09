"use client";

/**
 * Full-screen modal: live camera scan of book barcodes (EAN-13 / ISBN) → normalized ISBN string.
 * Uses html5-qrcode (dynamic import). Location: components/sell/BarcodeScannerModal.tsx
 */
import { normalizeIsbnFromScan } from "@/lib/books/normalizeIsbnFromScan";
import { ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SCANNER_ELEMENT_ID = "shelfswap-isbn-scanner";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with normalized ISBN (10 or 13 digits) after a successful read. */
  onIsbn: (isbn: string) => void;
};

export function BarcodeScannerModal({ open, onClose, onIsbn }: Props) {
  const [camError, setCamError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);
  const onIsbnRef = useRef(onIsbn);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onIsbnRef.current = onIsbn;
    onCloseRef.current = onClose;
  }, [onIsbn, onClose]);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* already stopped */
    }
    try {
      s.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const handleClose = useCallback(async () => {
    handledRef.current = false;
    setCamError(null);
    await stopScanner();
    onClose();
  }, [onClose, stopScanner]);

  useEffect(() => {
    if (!open) return;

    handledRef.current = false;
    setCamError(null);
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const el = document.getElementById(SCANNER_ELEMENT_ID);
        if (!el) return;

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        const onSuccess = async (text: string) => {
          if (handledRef.current || cancelled) return;
          const isbn = normalizeIsbnFromScan(text);
          if (!isbn) return;

          handledRef.current = true;
          try {
            await scanner.stop();
            scanner.clear();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
          onIsbnRef.current(isbn);
          onCloseRef.current();
        };

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const w = Math.floor(viewfinderWidth * 0.85);
              const h = Math.floor(viewfinderHeight * 0.35);
              return { width: w, height: Math.max(h, 90) };
            },
          },
          onSuccess,
          () => {
            /* scan frame — ignore per-frame errors */
          },
        );
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : "Could not start the camera.";
        setCamError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Camera permission denied. Allow camera access or type the ISBN instead."
            : msg,
        );
      }
    })();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, stopScanner]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scan-title"
    >
      <div className="relative flex w-full max-w-lg flex-col rounded-t-2xl bg-base-100 sm:rounded-2xl shadow-2xl border border-base-300 overflow-hidden max-h-[90dvh]">
        <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <ScanLine className="h-5 w-5 shrink-0" aria-hidden />
            <h2 id="barcode-scan-title" className="shelfswap-heading text-lg font-semibold">
              Scan barcode
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => void handleClose()}
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black">
          <div
            id={SCANNER_ELEMENT_ID}
            className="w-full min-h-[220px] sm:min-h-[280px]"
          />
        </div>

        <div className="space-y-2 px-4 py-3 text-center text-sm text-base-content/70">
          {camError ? (
            <p className="text-error">{camError}</p>
          ) : (
            <p>
              Aim at the barcode on the back cover (ISBN). Works best in good light — hold
              steady until it beeps.
            </p>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleClose()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
