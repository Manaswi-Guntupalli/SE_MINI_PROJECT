import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Feedback, Loading, Panel, StatusBadge } from './ui';

export default function ResultsPanel({ endpoint, instructor = false, refreshKey = 0 }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true); setError('');
      try { const response = await axios.get(endpoint); if (current) setResults(response.data); }
      catch (failure) { if (current) setError(failure.response?.data?.message || 'Could not load results. Retry when connected.'); }
      finally { if (current) setLoading(false); }
    }
    void load();
    return () => { current = false; };
  }, [endpoint, reload, refreshKey]);
  return <Panel id="results" aria-label="Results"><div className="section-heading"><h2>{instructor ? 'Exam results' : 'My results'}</h2>
    <Button disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh results</Button></div>
    {loading ? <Loading>Loading results...</Loading> : error ? <Feedback error>{error}</Feedback> : results.length === 0 ? <p className="empty-state">No evaluated results yet.</p>
      : <div className="table-scroll"><table><caption>{instructor ? 'Results for this owned examination' : 'Your evaluated examinations'}</caption><thead><tr><th scope="col">{instructor ? 'Student' : 'Examination'}</th><th scope="col">Score</th><th scope="col">Status</th></tr></thead>
        <tbody>{results.map(result => <tr key={result._id}><td>{instructor ? <><strong>{result.student?.name || 'Student unavailable'}</strong>{result.student?.email && <small>{result.student.email}</small>}</> : result.examId}</td><td>{result.score} / {result.maximum}</td><td><StatusBadge>{result.status}</StatusBadge></td></tr>)}</tbody></table></div>}
  </Panel>;
}
