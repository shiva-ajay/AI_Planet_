import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Homepage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GenAIStackPage from "./pages/GenAIStackPage";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import "reactflow/dist/style.css";
import { ReactFlowProvider } from "reactflow";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workflows/create-workflow" element={<GenAIStackPage />} />
          <Route
            path="/workflows/:workflowId/edit"
            element={
              <ReactFlowProvider>
                <WorkflowBuilder />
              </ReactFlowProvider>
            }
          />
          {/* You might also want to catch invalid routes */}
          <Route path="*" element={<div>404 Not Found</div>} />{" "}
        </Routes>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}

export default App;
