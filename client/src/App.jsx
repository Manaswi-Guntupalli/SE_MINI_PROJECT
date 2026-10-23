import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000/api/exams";
const INSTRUCTOR_ID = "tanusha";

const emptyQuestionForm = {
  questionText: "",
  options: ["", "", "", ""],
  correctOption: 0,
  marks: 1,
};

function App() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    startTime: "",
    duration: 30,
  });

  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const loadExams = async () => {
    try {
      const response = await axios.get(
        `${API}/instructor/${INSTRUCTOR_ID}`
      );
      setExams(response.data);
    } catch (error) {
      alert(error.response?.data?.message || "Could not load exams");
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const createExam = async (event) => {
    event.preventDefault();

    try {
      await axios.post(API, {
        ...examForm,
        instructorId: INSTRUCTOR_ID,
      });

      setExamForm({
        title: "",
        description: "",
        startTime: "",
        duration: 30,
      });

      await loadExams();
      alert("Exam created successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Could not create exam");
    }
  };

  const selectExam = async (id) => {
    try {
      const response = await axios.get(`${API}/${id}`);
      setSelectedExam(response.data);
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestionForm);
    } catch (error) {
      alert(error.response?.data?.message || "Could not open exam");
    }
  };

  const updateExam = async () => {
    try {
      const response = await axios.put(
        `${API}/${selectedExam._id}`,
        {
          title: selectedExam.title,
          description: selectedExam.description,
          startTime: selectedExam.startTime,
          duration: selectedExam.duration,
        }
      );

      setSelectedExam(response.data);
      await loadExams();
      alert("Draft updated successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Could not update exam");
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm("Delete this draft exam?")) {
      return;
    }

    try {
      await axios.delete(`${API}/${id}`);

      if (selectedExam?._id === id) {
        setSelectedExam(null);
      }

      await loadExams();
      alert("Exam deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Could not delete exam");
    }
  };

  const getQuestionPayload = () => {
    const options = questionForm.options.map((text, index) => ({
      text,
      isCorrect: index === Number(questionForm.correctOption),
    }));

    return {
      questionText: questionForm.questionText,
      options,
      marks: Number(questionForm.marks),
    };
  };

  const saveQuestion = async (event) => {
    event.preventDefault();

    try {
      let response;

      if (editingQuestionId) {
        response = await axios.put(
          `${API}/${selectedExam._id}/questions/${editingQuestionId}`,
          getQuestionPayload()
        );

        alert("Question updated successfully");
      } else {
        response = await axios.post(
          `${API}/${selectedExam._id}/questions`,
          getQuestionPayload()
        );

        alert("Question added successfully");
      }

      setSelectedExam(response.data);
      setQuestionForm(emptyQuestionForm);
      setEditingQuestionId(null);
    } catch (error) {
      alert(error.response?.data?.message || "Could not save question");
    }
  };

  const startEditingQuestion = (question) => {
    const correctIndex = question.options.findIndex(
      (option) => option.isCorrect
    );

    setQuestionForm({
      questionText: question.questionText,
      options: question.options.map((option) => option.text),
      correctOption: correctIndex >= 0 ? correctIndex : 0,
      marks: question.marks,
    });

    setEditingQuestionId(question._id);
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
  };

  const deleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API}/${selectedExam._id}/questions/${questionId}`
      );

      setSelectedExam(response.data);

      if (editingQuestionId === questionId) {
        cancelEditingQuestion();
      }

      alert("Question deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Could not delete question");
    }
  };

  const publishExam = async () => {
    if (
      !window.confirm(
        "Publish this exam? It cannot be edited afterwards."
      )
    ) {
      return;
    }

    try {
      const response = await axios.post(
        `${API}/${selectedExam._id}/publish`
      );

      setSelectedExam(response.data);
      await loadExams();
      alert("Exam published successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Could not publish exam");
    }
  };

  return (
    <div className="container">
      <h1>Online Exam Portal</h1>
      <p className="subtitle">
        Instructor - Exam & Question Management
      </p>

      <section>
        <h2>Create Exam</h2>

        <form onSubmit={createExam}>
          <input
            required
            placeholder="Exam title"
            value={examForm.title}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                title: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Description"
            value={examForm.description}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                description: e.target.value,
              })
            }
          />

          <label>Start time</label>
          <input
            required
            type="datetime-local"
            value={examForm.startTime}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                startTime: e.target.value,
              })
            }
          />

          <label>Duration (minutes)</label>
          <input
            required
            type="number"
            min="1"
            value={examForm.duration}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                duration: e.target.value,
              })
            }
          />

          <button type="submit">Create Exam</button>
        </form>
      </section>

      <section>
        <h2>My Exams</h2>

        {exams.length === 0 && <p>No exams created yet.</p>}

        {exams.map((exam) => (
          <div className="exam-card" key={exam._id}>
            <div>
              <strong>{exam.title}</strong>
              <span className="status">{exam.status}</span>
            </div>

            <div className="actions">
              <button onClick={() => selectExam(exam._id)}>
                Open
              </button>

              {exam.status === "Draft" && (
                <button
                  className="danger"
                  onClick={() => deleteExam(exam._id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {selectedExam && (
        <section>
          <h2>Manage Exam</h2>

          <p>
            Status: <strong>{selectedExam.status}</strong>
          </p>

          {selectedExam.status === "Draft" && (
            <>
              <input
                value={selectedExam.title}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    title: e.target.value,
                  })
                }
              />

              <textarea
                value={selectedExam.description}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    description: e.target.value,
                  })
                }
              />

              <label>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={selectedExam.duration}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    duration: e.target.value,
                  })
                }
              />

              <button onClick={updateExam}>
                Save Exam Changes
              </button>

              <hr />

              <h3>
                {editingQuestionId ? "Edit MCQ" : "Add MCQ"}
              </h3>

              <form onSubmit={saveQuestion}>
                <input
                  required
                  placeholder="Question"
                  value={questionForm.questionText}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      questionText: e.target.value,
                    })
                  }
                />

                {questionForm.options.map((option, index) => (
                  <div className="option-row" key={index}>
                    <input
                      type="radio"
                      name="correctOption"
                      checked={
                        Number(questionForm.correctOption) === index
                      }
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          correctOption: index,
                        })
                      }
                    />

                    <input
                      required
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const options = [
                          ...questionForm.options,
                        ];

                        options[index] = e.target.value;

                        setQuestionForm({
                          ...questionForm,
                          options,
                        });
                      }}
                    />
                  </div>
                ))}

                <label>Marks</label>
                <input
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      marks: e.target.value,
                    })
                  }
                />

                <button type="submit">
                  {editingQuestionId
                    ? "Save Question Changes"
                    : "Add Question"}
                </button>

                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={cancelEditingQuestion}
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </>
          )}

          <h3>Questions</h3>

          {selectedExam.questions.length === 0 && (
            <p>No questions added yet.</p>
          )}

          {selectedExam.questions.map((question, index) => (
            <div
              className="question-card"
              key={question._id}
            >
              <strong>
                {index + 1}. {question.questionText}
              </strong>

              <ul>
                {question.options.map((option) => (
                  <li key={option._id}>
                    {option.text}
                    {option.isCorrect ? " ✓" : ""}
                  </li>
                ))}
              </ul>

              <p>Marks: {question.marks}</p>

              {selectedExam.status === "Draft" && (
                <div className="actions">
                  <button
                    onClick={() =>
                      startEditingQuestion(question)
                    }
                  >
                    Edit Question
                  </button>

                  <button
                    className="danger"
                    onClick={() =>
                      deleteQuestion(question._id)
                    }
                  >
                    Delete Question
                  </button>
                </div>
              )}
            </div>
          ))}

          {selectedExam.status === "Draft" && (
            <button
              className="publish"
              onClick={publishExam}
            >
              Publish Exam
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default App;