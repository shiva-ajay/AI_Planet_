# 🧠 GenAI Stack - No-Code AI Workflow Builder

GenAI Stack is a **low-code/no-code platform** to visually build, configure, and run intelligent workflows using LLMs, embeddings, knowledge bases, and vector search. Built for fast prototyping and production-ready use-cases.

> ⚡ Drag, Connect, Run — all from your browser.

---

### 🚀 Features

- 🧱 **Drag & Drop Workflow Builder** with React Flow
- 🧠 **LLM Nodes** (Gemini/OpenAI) for prompt-based intelligence
- 📚 **Knowledge Base Nodes** using embeddings + ChromaDB
- 💬 **Built-in AI Chatbot** connected to your workflows
- 🔐 **Secure API Key Handling** with encryption
- 📦 **Supabase** as the backend database
- 📂 Upload & use PDFs for context in workflows
- 📊 Easy saving/loading of workflows

---



## 🧠 Node Types

| Node             | Purpose                                              |
|------------------|------------------------------------------------------|
| User Query       | Entry point – accepts user question                  |
| Knowledge Base   | Upload PDFs, vectorize using embeddings              |
| LLM Engine       | Uses Gemini to generate final responses              |
| Output           | Displays final response in chat                      |

---

## 🖥️ Stack

| Layer        | Tech                               |
|--------------|------------------------------------|
| Frontend     | React + TypeScript + Tailwind CSS  |
| Visual Flow  | React Flow                         |
| Backend      | FastAPI                            |
| Database     | Supabase (PostgreSQL)              |
| Embedding    | Gemini Embeddings / OpenAI         |
| Vector DB    | ChromaDB                           |
| LLM Inference| Gemini 1.5 Pro / Flash             |
| Security     | AES-256 Encryption                 |
| Zustand      | State Management                   |
---

### 📦 Setup Instructions

#### 1. Clone the Repo

```bash
git clone https://github.com/your-username/genai-stack.git
cd genai-stack

Project Overview
Installation
2. Install Frontend Dependencies
cd client
npm install
npm run dev

3. Install Backend Dependencies
cd ../server
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload

🔑 Environment Variables
Make sure to create a .env file in server/ with:
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
ENCRYPTION_SECRET_KEY=your_32_byte_key  # Used to encrypt API keys

📖 How It Works

Build Workflows with nodes like:
User Query Node
LLM Node
Knowledge Base Node
Output Node


Connect them visually with edges
Save the workflow to Supabase
Run the workflow using the built-in chatbot
Chat UI uses Gemini + ChromaDB for intelligent answers

🔐 Security

API keys are AES encrypted before storing in Supabase
Decryption only happens at runtime during workflow execution

🧠 Future Plans

🔌 OpenAI + Anthropic + Mistral integration
💾 Vector DB configuration via UI
📜 Prompt templates and memory support
🧩 Node plugin system

