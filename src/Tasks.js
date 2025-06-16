import React, { useState } from "react";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  const handleAdd = () => {
    if (newTask.trim() === "") return;
    setTasks([...tasks, newTask]);
    setNewTask("");
  };

  return (
    <section style={{ marginBottom: "30px" }}>
      <h2>✅ My Tasks</h2>
      <div style={{ marginBottom: "10px" }}>
        <input
          placeholder="New Task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          style={{ padding: "5px", marginRight: "8px" }}
        />
        <button onClick={handleAdd}>Add Task</button>
      </div>

      <ul>
        {tasks.map((task, index) => (
          <li key={index}>{task}</li>
        ))}
      </ul>
    </section>
  );
}
