import { createContext, useContext, useRef, useState } from "react";

interface SeminarDialogContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  registerOnCreateCallback: (callback: (() => void) | null) => void;
  callbackRef: React.MutableRefObject<(() => void) | null>;
}

const SeminarDialogContext = createContext<
  SeminarDialogContextType | undefined
>(undefined);

export const SeminarDialogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const callbackRef = useRef<(() => void) | null>(null);

  return (
    <SeminarDialogContext.Provider
      value={{
        isOpen,
        openDialog: () => setIsOpen(true),
        closeDialog: () => setIsOpen(false),
        registerOnCreateCallback: (callback) => {
          callbackRef.current = callback;
        },
        callbackRef,
      }}
    >
      {children}
    </SeminarDialogContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSeminarDialog = () => {
  const context = useContext(SeminarDialogContext);
  if (!context) {
    throw new Error(
      "useSeminarDialog must be used within SeminarDialogProvider",
    );
  }
  return context;
};
