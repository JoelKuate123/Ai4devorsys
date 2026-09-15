"""
Test complet du pipeline RAG - Société Générale Pilier 3 T2 2022
"""
import os, sys, time

print("=" * 65)
print("  TEST RAG — Société Générale Pilier 3 T2 2022")
print("=" * 65)

# ── 1. Clé API ──────────────────────────────────────────────────
print("\n[1/5] Chargement de la clé API...")
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
assert api_key and not api_key.startswith("sk-proj-VOTRE"), \
    "Clé API manquante ou non remplacée dans .env"
print(f"    OK — Clé : {api_key[:12]}...")

# ── 2. Chargement du PDF ────────────────────────────────────────
print("\n[2/5] Chargement du PDF...")
from langchain_community.document_loaders import PyPDFLoader

PDF = "Societe-Generale-Pilier-3_T2-2022_FR.pdf"
assert os.path.exists(PDF), f"PDF introuvable : {PDF}"
t0 = time.time()
loader = PyPDFLoader(PDF)
pages = loader.load()
print(f"    OK — {len(pages)} pages chargées en {time.time()-t0:.1f}s")

# ── 3. Découpage en chunks ──────────────────────────────────────
print("\n[3/5] Découpage du texte...")
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)
chunks = splitter.split_documents(pages)
print(f"    OK — {len(chunks)} chunks créés")
print(f"    Exemple chunk 10 : {chunks[10].page_content[:120]!r}...")

# ── 4. Vectorisation FAISS ──────────────────────────────────────
print("\n[4/5] Vectorisation + index FAISS...")
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
t0 = time.time()
vectorstore = FAISS.from_documents(chunks, embeddings)
print(f"    OK — {vectorstore.index.ntotal} vecteurs indexés en {time.time()-t0:.1f}s")

vectorstore.save_local("faiss_index_sg_pilier3")
print("    Index sauvegardé → faiss_index_sg_pilier3/")

# ── 5. Chaîne RAG + questions ───────────────────────────────────
print("\n[5/5] Construction de la chaîne RAG et questions test...")
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

PROMPT = """
Tu es un analyste financier expert. Réponds à la question en te basant UNIQUEMENT sur le contexte extrait du rapport Pilier 3 T2 2022 de la Société Générale.
Si l'information n'est pas dans le contexte, dis-le clairement. Sois concis (3-5 phrases max).

CONTEXTE :
{context}

QUESTION : {question}

RÉPONSE :
"""

prompt = ChatPromptTemplate.from_template(PROMPT)
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def formater_docs(docs):
    return "\n\n".join(
        f"[Page {d.metadata.get('page', '?')+1}] {d.page_content}"
        for d in docs
    )

chaine_rag = (
    {"context": retriever | formater_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

QUESTIONS = [
    "Quel est le ratio CET1 de la Société Générale au T2 2022 ?",
    "Quel est le montant total des actifs pondérés par les risques (RWA) ?",
    "Quelle est la situation de liquidité du groupe (LCR, NSFR) ?",
]

print()
for i, q in enumerate(QUESTIONS, 1):
    print(f"\n{'─'*65}")
    print(f"Q{i}: {q}")
    print("─" * 65)
    t0 = time.time()
    rep = chaine_rag.invoke(q)
    sources = sorted(set(d.metadata.get('page', 0)+1 for d in retriever.invoke(q)))
    print(f"{rep}")
    print(f"\n  → Sources : pages {sources}  |  {time.time()-t0:.1f}s")

print("\n" + "=" * 65)
print("  TOUS LES TESTS PASSÉS ✓")
print("=" * 65)
