import { createContext, useContext, useRef, useState } from "react";

interface NewSessionDialogContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  sectionLabelRef: React.MutableRefObject<HTMLInputElement | null>;
  workingQuestionRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  initialClaimsRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  initialClaimsError: string;
  setInitialClaimsError: (error: string) => void;
  onCreateCallback: React.MutableRefObject<(() => void) | null>;
  seminarIdRef: React.MutableRefObject<string | null>;
}

const NewSessionDialogContext = createContext<
  NewSessionDialogContextType | undefined
>(undefined);

export const NewSessionDialogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const sectionLabelRef = useRef<HTMLInputElement>(null);
  const workingQuestionRef = useRef<HTMLTextAreaElement>(null);
  const initialClaimsRef = useRef<HTMLTextAreaElement>(null);
  const [initialClaimsError, setInitialClaimsError] = useState("");
  const onCreateCallback = useRef<(() => void) | null>(null);
  const seminarIdRef = useRef<string | null>(null);

  return (
    <NewSessionDialogContext.Provider
      value={{
        isOpen,
        openDialog: () => setIsOpen(true),
        closeDialog: () => setIsOpen(false),
        sectionLabelRef,
        workingQuestionRef,
        initialClaimsRef,
        initialClaimsError,
        setInitialClaimsError,
        onCreateCallback,
        seminarIdRef,
      }}
    >
      {children}
    </NewSessionDialogContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNewSessionDialog = () => {
  const context = useContext(NewSessionDialogContext);
  if (!context) {
    throw new Error(
      "useNewSessionDialog must be used within NewSessionDialogProvider",
    );
  }
  return context;
};
