import { useRef, useState } from 'react';
import axios from 'axios';
import { browserTimeZone, displayTime } from './dateTime';

export default function ExamAttempt({ data, api, csrfToken }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((data.responses || []).map(value => [value.questionId, value])));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(null);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const question = data.questions[index];
  const active = data.attempt.status !== 'Submitted';
  async function save(questionId, selectedOptionId) {
    if (busy.current || !active) return;
    busy.current = true;
    setSaving(true);
    setFailed(null);
    setMessage('Saving answer?');
    try {
      const result = await axios.put(`${api}/student/attempts/${data.attempt._id}/responses/${questionId}`,
        { selectedOptionId, expectedRevision: answers[questionId]?.revision || 0 },
        { headers: { 'X-CSRF-Token': csrfToken } });
      setAnswers(current => ({ ...current, [questionId]: result.data.response }));
      setMessage('Answer saved');
    } catch (error) {
      setFailed({ questionId, selectedOptionId });
      setMessage(error.response?.data?.message || 'Answer was not saved. Retry while time remains.');
    } finally { busy.current = false; setSaving(false); }
  }
  return <section aria-label="Examination">
    <h2>{active ? 'Exam started' : 'Exam submitted'}</h2>
    <p>Deadline: {displayTime(data.attempt.deadline)} ({browserTimeZone})</p>
    <p>{Object.keys(answers).length} of {data.questions.length} answers saved</p>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    {failed && active && <button disabled={saving} onClick={() => save(failed.questionId, failed.selectedOptionId)}>Retry answer save</button>}
    {question && <fieldset disabled={!active || saving}>
      <legend>Question {index + 1} of {data.questions.length}: {question.questionText}</legend>
      {question.options.map(option => <label className="answer-option" key={option._id}>
        <input type="radio" name={`answer-${question._id}`} checked={answers[question._id]?.selectedOptionId === option._id}
          onChange={() => save(question._id, option._id)} />{option.text}
      </label>)}
    </fieldset>}
    <nav aria-label="Question navigation">
      <button disabled={index === 0} onClick={() => setIndex(value => value - 1)}>Previous question</button>
      <button disabled={index >= data.questions.length - 1} onClick={() => setIndex(value => value + 1)}>Next question</button>
      {data.questions.map((item, position) => <button key={item._id} aria-current={index === position ? 'step' : undefined}
        onClick={() => setIndex(position)} aria-label={`Question ${position + 1}, ${answers[item._id] ? 'answered' : 'unanswered'}`}>{position + 1}</button>)}
    </nav>
  </section>;
}
