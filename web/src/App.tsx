import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { EditSeminarDialogProvider } from "@/contexts/EditSeminarDialogContext";
import { NewSessionDialogProvider } from "@/contexts/NewSessionDialogContext";
import { SeminarDialogProvider } from "@/contexts/SeminarDialogContext";
import { SessionEventsProvider } from "@/contexts/SessionEventsContext";
import { ApiProvider } from "@/lib/ApiContext";
import Export from "@/pages/Export";
import Login from "@/pages/Login";
import SeminarDetail from "@/pages/SeminarDetail";
import SeminarList from "@/pages/SeminarList";
import SessionReview from "@/pages/SessionReview";
import SessionRunner from "@/pages/SessionRunner";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Authenticated shell */}
        <Route
          element={
            <AuthGuard>
              <ApiProvider>
                <SessionEventsProvider>
                  <SeminarDialogProvider>
                    <EditSeminarDialogProvider>
                      <NewSessionDialogProvider>
                        <Layout />
                      </NewSessionDialogProvider>
                    </EditSeminarDialogProvider>
                  </SeminarDialogProvider>
                </SessionEventsProvider>
              </ApiProvider>
            </AuthGuard>
          }
        >
          {/* Seminars */}
          <Route path="/seminars" element={<SeminarList />} />
          <Route path="/seminars/:id" element={<SeminarDetail />} />
          <Route
            path="/seminars/:id/export"
            element={<Export resourceType="seminar" />}
          />

          {/* Sessions */}
          <Route path="/sessions/:id" element={<SessionRunner />} />
          <Route path="/sessions/:id/review" element={<SessionReview />} />
          <Route
            path="/sessions/:id/export"
            element={<Export resourceType="session" />}
          />

          {/* Default */}
          <Route path="/" element={<Navigate to="/seminars" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
