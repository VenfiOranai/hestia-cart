import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ListPage from "./pages/ListPage";
import JoinPage from "./pages/JoinPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/list/:id" element={<ListPage />} />
          <Route path="/join/:shareToken" element={<JoinPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
