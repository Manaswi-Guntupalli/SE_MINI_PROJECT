import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Feedback, Loading, Panel, StatusBadge } from './ui';

export default function ResultsPanel({ endpoint, instructor = false, refreshKey = 0, pendingEndpoint }) {
  const [results, setResults] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [response, waiting] = await Promise.all([
          axios.get(endpoint), pendingEndpoint ? axios.get(pendingEndpoint) : Promise.resolve(null),
        ]);
        if (!current) return;
        const data = response.data;
        setResults(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
        setPending(Array.isArray(waiting?.data) ? waiting.data : Array.isArray(data?.pending) ? data.pending : []);
      } catch (failure) {
        if (current) setError(failure.response?.data?.message || 'Could not load results. Retry when connected.');
      } finally { if (current) setLoading(false); }
    }
    void load();
    return () => { current = false; };
  }, [endpoint, pendingEndpoint, reload, refreshKey]);
  const identity = result => {
    const student = result.student || (typeof result.studentId === 'object' ? result.studentId : null);
    return instructor ? <><strong>{student?.name || 'Student unavailable'}</strong>{student?.email && <small>{student.email}</small>}</>
      : result.examTitle || 'Examination';
  };
  return <Panel id="results" aria-label="Results">
    <div className="section-heading"><h2>{instructor ? 'Exam results' : 'My results'}</h2>
      <Button disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh results</Button></div>
    {loading ? <Loading>Loading results...</Loading> : error ? <Feedback error>{error}</Feedback> : <>
      {results.length === 0 ? <p className="empty-state">No evaluated results yet.</p>
        : <div className="table-scroll"><table><caption>{instructor ? 'Results for this owned examination' : 'Your evaluated examinations'}</caption>
          <thead><tr><th scope="col">{instructor ? 'Student' : 'Examination'}</th><th scope="col">Score</th><th scope="col">Status</th></tr></thead>
          <tbody>{results.map(result => <tr key={result._id}><td>{identity(result)}</td><td>{result.score} / {result.maximum}</td><td><StatusBadge>{result.status}</StatusBadge></td></tr>)}</tbody>
        </table></div>}
      {pending.length > 0 && <div className="table-scroll"><table><caption>Submitted — evaluation pending</caption>
        <thead><tr><th scope="col">{instructor ? 'Student' : 'Examination'}</th><th scope="col">Status</th></tr></thead>
        <tbody>{pending.map(item => <tr key={item._id}><td>{identity(item)}</td><td>Evaluation pending. Your submitted answers are saved; refresh results shortly.</td></tr>)}</tbody>
      </table></div>}
      {instructor && pending.length === 0 && <p>No pending evaluations.</p>}
    </>}
  </Panel>;
}
