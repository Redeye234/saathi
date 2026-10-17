"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <rect width="42" height="42" rx="13" fill="currentColor" />
        <path
          d="M11 26c0-12 5-19 10-19s10 7 10 19M16 25c0-8 2-13 5-13s5 5 5 13M11 29q10 9 20 0"
          fill="none"
          stroke="#edf1d8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      {!small && (
        <span>
          saathi<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
export function WorkersArt() {
  return (
    <svg
      className="workers-art"
      viewBox="0 0 440 280"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="253" cy="142" r="126" fill="#dce7c4" />
      <circle cx="365" cy="44" r="13" fill="#f5c981" />
      <path
        d="M93 240V107h38v133m10 0V76h48v164m130 0V108h36v132m8 0V142h34v98"
        fill="#cbdab2"
      />
      <path
        d="M153 95h9m9 0h9m-27 15h9m9 0h9m-27 15h9m9 0h9M104 124h12m-12 16h12m215-14h12m-12 16h12"
        stroke="#e9efd9"
        strokeWidth="5"
      />
      <path d="M378 246c-5-33 12-63 30-72-1 28-11 51-30 72Z" fill="#779c78" />
      <path d="M376 252c-26-17-33-39-31-58 19 12 29 29 31 58Z" fill="#94af88" />
      <path
        d="M60 259h354"
        stroke="#648777"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m115 186-15 73h24l20-65 12 65h25l-15-78" fill="#304d45" />
      <path d="M109 113q25-16 50 0l17 79h-74Z" fill="#de9465" />
      <path
        d="m106 121-29 44 12 9 34-35m34-18 21 42-10 7-28-32"
        fill="#de9465"
      />
      <path
        d="m77 164-8 10c-4 9 7 14 11 7l9-9m88-10 8 8c6 9-4 15-9 8l-9-10"
        fill="#b16d4c"
      />
      <rect x="119" y="83" width="29" height="32" rx="12" fill="#b16d4c" />
      <path d="M118 91c-10-22 32-30 33-5v12h-7V85l-26 8Z" fill="#34483e" />
      <path
        d="m118 106 15 14 16-14M113 124h40"
        stroke="#f4c3a2"
        strokeWidth="2"
      />
      <rect x="78" y="113" width="35" height="45" rx="6" fill="#b77a52" />
      <path
        d="m115 260-17 0m64 0h21"
        stroke="#f1ebd6"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="m215 183-10 76h22l15-62 8 62h23l-10-77" fill="#244c49" />
      <path d="M216 111q21-13 42 0l16 83h-71Z" fill="#eff1d8" />
      <path
        d="m216 118-17 47-22-3-3 12 32 7 23-42m28-20 18 49-12 5-23-42"
        fill="#eff1d8"
      />
      <path
        d="m176 163-12-3c-9-1-12 11-1 13l13 2m99-10 4 12c3 11-11 13-12 5l-4-12"
        fill="#a46b51"
      />
      <path d="M216 92c-11-31 38-37 40-7l3 27h-44Z" fill="#284b42" />
      <rect x="225" y="83" width="25" height="32" rx="11" fill="#aa7257" />
      <path d="M222 91q16-3 20-12l11 13" fill="#284b42" />
      <path d="m218 112 17 20 21-22-11 60-21-2Z" fill="#84a38b" />
      <path
        d="M224 260h-22m49 0h24"
        stroke="#e4b388"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="m307 189-9 70h21l12-60 11 60h21l-8-70" fill="#557668" />
      <path d="M308 117q26-14 46 0l14 78h-70Z" fill="#d0ac63" />
      <path
        d="m309 123-17 49 12 5 20-42m29-12 21 46-12 8-23-42"
        fill="#d0ac63"
      />
      <path
        d="m293 170-3 13c-2 11 9 11 12 2l3-11m67-6 6 13c3 9-8 14-12 6l-6-12"
        fill="#bb835b"
      />
      <rect x="317" y="86" width="29" height="35" rx="13" fill="#bb835b" />
      <path d="M313 90c-2-28 39-29 38 0" fill="#ebc771" />
      <path
        d="M309 91h47m-23-23v18"
        stroke="#a78e4c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m314 117 7 40h23l4-40m-44 60h57"
        stroke="#efe6b8"
        strokeWidth="7"
      />
      <path
        d="M299 260h24m20 0h23"
        stroke="#293f37"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="m63 75 5-12m-2 22-13-3m325 21 10 5"
        stroke="#c9d4a7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M65 227c-1-22-13-38-29-43 3 21 14 34 29 43Z" fill="#829b6c" />
      <path d="M65 249v-33" stroke="#648777" strokeWidth="3" />
    </svg>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
