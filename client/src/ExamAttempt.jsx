import { Button, Input, Panel, Feedback, ConfirmDialog } from './ui';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { synchronizeClock, remainingTime, formatRemaining } from './examClock';
import { browserTimeZone, displayTime } from './dateTime';

export default function ExamAttempt({ data, api, csrfToken, onSubmitted, onClose }) {
  const busy = useRef(false);
  const submitted = useRef(data.attempt.status === 'Submitted');
  const notified = useRef(false);
  const completionHeading = useRef(null);
  const [saving, setSaving] = useState(false);
  const [clock, setClock] = useState(() => synchronizeClock(data.attempt.deadline, data.serverTime));
  const [remaining, setRemaining] = useState(() => remainingTime(clock));
  const [timerError, setTimerError] = useState('');
  const [status, setStatus] = useState(data.attempt.status);
  const [evaluationStatus, setEvaluationStatus] = useState(data.attempt.evaluationStatus);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const timeoutRequested = useRef(false);
  async function submit(reason) {
    if (busy.current || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await axios.post(`${api}/student/attempts/${data.attempt._id}/submit`, { reason }, { headers: { 'X-CSRF-Token': csrfToken } });
      if (result.data.attempt.status !== 'Submitted') throw new Error('Submission was not confirmed');
      submitted.current = true;
      setStatus('Submitted');
      setEvaluationStatus(result.data.attempt.evaluationStatus);
      setConfirming(false);
    } catch (error) { setSubmitError(error.response?.data?.message || 'Submission failed. Retry; saved answers remain on the server.'); }
    finally { setSubmitting(false); }
  }
  useEffect(() => {
    if (remaining > 0 || status === 'Submitted' || timeoutRequested.current || saving) return;
    timeoutRequested.current = true;
    void submit('Timeout');
  });
  useEffect(() => {
    if (status !== 'Submitted' || notified.current) return;
    notified.current = true;
    completionHeading.current?.focus();
    completionHeading.current?.scrollIntoView?.({ block: 'start' });
    onSubmitted?.();
  }, [status, onSubmitted]);
  useEffect(() => {
    if (status === 'Submitted') return;
    const tick = () => setRemaining(remainingTime(clock));
    const timer = setInterval(tick, 250);
    tick();
    return () => clearInterval(timer);
  }, [clock, status]);
  useEffect(() => {
    if (status === 'Submitted' && evaluationStatus === 'Evaluated') return;
    let current = true;
    async function synchronize() {
      try {
        const result = await axios.get(`${api}/student/attempts/${data.attempt._id}`);
        if (!current) return;
        // A read started before submission must never reopen the completed UI.
        if (submitted.current && result.data.attempt.status !== 'Submitted') return;
        if (result.data.attempt.status === 'Submitted') submitted.current = true;
        const next = synchronizeClock(result.data.attempt.deadline, result.data.serverTime);
        setClock(previous => ({ ...next, remaining: Math.min(next.remaining, remainingTime(previous)) }));
        setStatus(result.data.attempt.status);
        setEvaluationStatus(result.data.attempt.evaluationStatus);
        setTimerError('');
      } catch { if (current) setTimerError('Could not synchronize timer. The original deadline still applies.'); }
    }
    const timer = setInterval(synchronize, 15000);
    return () => { current = false; clearInterval(timer); };
  }, [api, data.attempt._id, status, evaluationStatus]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((data.responses || []).map(value => [value.questionId, value])));
  const [failed, setFailed] = useState(null);
  const [message, setMessage] = useState('');
  const question = data.questions[index];
  const active = status !== 'Submitted' && remaining > 0 && !submitting && !confirming;
  async function save(questionId, selectedOptionId) {
    if (busy.current || !active || remainingTime(clock) <= 0) return;
    busy.current = true;
    setSaving(true);
    setFailed(null);
    setMessage('Saving answer...');
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
  if (status === 'Submitted') return <Panel id="examination" aria-label="Submission complete">
    <h2 ref={completionHeading} tabIndex={-1}>Exam submitted</h2>
    <Feedback>{evaluationStatus === 'Evaluated' ? 'Evaluation complete. Your result is available.' : 'Submitted. Evaluation pending; the server will retry automatically.'}</Feedback>
    <p>Your examination is closed. Your saved responses have been finalized.</p>
    <a className="button" href="#results" onClick={() => onClose?.('results')}>View my results</a>
    {onClose && <Button className="secondary" onClick={() => onClose('available-exams')}>Back to available exams</Button>}
  </Panel>;
  return <Panel id="examination" aria-label="Examination">
    <h2>{status === 'Submitted' ? 'Exam submitted' : 'Exam started'}</h2>
    <p role="timer" aria-label="Time remaining">Time remaining: {formatRemaining(remaining)}</p>
    <Feedback error>{timerError}</Feedback>
    {remaining === 0 && status !== 'Submitted' && <p role="status">Time expired. Answer editing is locked; awaiting server finalization.</p>}
    <p>Deadline: {displayTime(data.attempt.deadline)} ({browserTimeZone})</p>
    <p>{Object.keys(answers).length} of {data.questions.length} answers saved</p>
    {status === 'Submitted' && <p role="status">{evaluationStatus === 'Evaluated' ? 'Evaluation complete. Your result is available.' : 'Submitted. Evaluation pending; the server will retry automatically.'}</p>}
    <Feedback error>{submitError}</Feedback>
    {submitError && remaining === 0 && status !== 'Submitted' && <Button disabled={submitting} onClick={() => submit('Timeout')}>Retry submission</Button>}
    <Feedback error={!!failed}>{message}</Feedback>
    {failed && active && <Button disabled={saving} onClick={() => save(failed.questionId, failed.selectedOptionId)}>Retry answer save</Button>}
    {question && <fieldset disabled={!active || saving}>
      <legend>Question {index + 1} of {data.questions.length}: {question.questionText}</legend>
      {question.options.map(option => <label className="answer-option" key={option._id}>
        <Input type="radio" name={`answer-${question._id}`} checked={answers[question._id]?.selectedOptionId === option._id}
          onChange={() => save(question._id, option._id)} />{option.text}
      </label>)}
    </fieldset>}
    <nav aria-label="Question navigation">
      <Button disabled={index === 0} onClick={() => setIndex(value => value - 1)}>Previous question</Button>
      <Button disabled={index >= data.questions.length - 1} onClick={() => setIndex(value => value + 1)}>Next question</Button>
      {data.questions.map((item, position) => <Button key={item._id} aria-current={index === position ? 'step' : undefined}
        onClick={() => setIndex(position)} aria-label={`Question ${position + 1}, ${answers[item._id] ? 'answered' : 'unanswered'}`}>{position + 1}</Button>)}
    </nav>
    {status !== 'Submitted' && remaining > 0 && <Button disabled={saving || submitting} onClick={() => setConfirming(true)}>Submit examination</Button>}
    {confirming && <ConfirmDialog title="Submit examination?" busy={saving || submitting}
      onCancel={() => setConfirming(false)} onConfirm={() => submit(remainingTime(clock) > 0 ? 'Manual' : 'Timeout')} confirmLabel="Confirm submission">
      <p>{Object.keys(answers).length} answers saved. {data.questions.length - Object.keys(answers).length} unanswered.</p>
      <p>Only successfully saved responses will be submitted. This action ends your attempt.</p>
      {failed && <Feedback error>An answer failed to save. Cancel to retry it while time remains.</Feedback>}
    </ConfirmDialog>}
  </Panel>;
}
