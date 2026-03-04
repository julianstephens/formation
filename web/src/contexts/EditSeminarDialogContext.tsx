import type { Seminar } from "@/lib/types";
import { createContext, useContext, useRef, useState } from "react";

interface EditSeminarDialogContextType {
  isOpen: boolean;
  openDialog: (seminar: Seminar) => void;
  closeDialog: () => void;
  seminar: Seminar | null;
  titleRef: React.MutableRefObject<HTMLInputElement | null>;
  authorRef: React.MutableRefObject<HTMLInputElement | null>;
  editionNotesRef: React.MutableRefObject<HTMLInputElement | null>;
  callbackRef: React.MutableRefObject<((seminar: Seminar) => void) | null>;
}

const EditSeminarDialogContext = createContext<
  EditSeminarDialogContextType | undefined
>(undefined);

export const EditSeminarDialogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [seminar, setSeminar] = useState<Seminar | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  const editionNotesRef = useRef<HTMLInputElement>(null);
  const callbackRef = useRef<((seminar: Seminar) => void) | null>(null);

  return (
    <EditSeminarDialogContext.Provider
      value={{
        isOpen,
        openDialog: (s: Seminar) => {
          setSeminar(s);
          setIsOpen(true);
        },
        closeDialog: () => setIsOpen(false),
        seminar,
        titleRef,
        authorRef,
        editionNotesRef,
        callbackRef,
      }}
    >
      {children}
    </EditSeminarDialogContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEditSeminarDialog = () => {
  const context = useContext(EditSeminarDialogContext);
  if (!context) {
    throw new Error(
      "useEditSeminarDialog must be used within EditSeminarDialogProvider",
    );
  }
  return context;
};
