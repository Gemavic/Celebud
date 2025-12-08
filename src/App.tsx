import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ArticleDetail } from './pages/ArticleDetail';
import EditorialPage from './pages/EditorialPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<ArticleDetail />} />
        <Route path="/editorial" element={<EditorialPage />} />
      </Routes>
    </Router>
  );
}

export default App;
