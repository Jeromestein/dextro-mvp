"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, RefreshCw } from "lucide-react";
import ChatGPTConnection from "./chatgpt-connection";
import { useConnection } from "./provider";
export default function ConnectionSettings() {
  const w = useConnection();
  return <main className="settings-page product-page">
    <Link href="/builder" className="back-link"><ArrowLeft size={15} /> Back to builder</Link>
    <div className="page-heading"><div><span className="kicker">WORKSPACE</span><h1>Settings</h1><p>Connect your writing assistant. Keep your workspace yours.</p></div></div>
    <div className="settings-layout">
      <aside><h2>AI connection</h2><p>Account, model, and access settings live here. Your games stay in this browser.</p></aside>
      <div className="settings-card">
        {w.checking ? <p role="status">Checking connection…</p> : w.provider === "chatgpt" && w.local ?
          <ChatGPTConnection onReady={w.setAiReady} model={w.model} onModel={w.setModel} disabled={false} /> :
          <section><h2><KeyRound size={20} /> {w.provider === "chatgpt" ? "Local connection required" : "OpenAI API"}</h2>
            <p>{w.provider === "chatgpt" ? "ChatGPT plan testing is available in the local studio. Open this project on your computer at localhost:3100 or 127.0.0.1:3100." : w.aiReady ? "Your studio's API connection is configured. Enter your workshop code to enable generation in this tab." : "The studio owner needs to configure an API key, model, and workshop code before AI generation is available."}</p>
            {w.provider !== "chatgpt" && <label className="field-label">Workshop access code<input type="password" autoComplete="off" value={w.accessCode} onChange={(e) => w.setAccessCode(e.target.value)} /></label>}
            <button className="button" onClick={() => void w.checkConnection()}><RefreshCw size={15} /> Check connection</button>
          </section>}
        <section className="image-connection">
          <h2>Scene images · OpenAI API</h2>
          <p>{w.imagesReady ? "Image generation is configured. Each generated image uses separately billed OpenAI API usage." : "The studio owner needs to add OPENAI_API_KEY and AI_ACCESS_CODE to the server environment, then restart the server."}</p>
          <p className="quiet">{w.imageModel || "OpenAI image model"} · Economy quality · One landscape image per request. Configuration does not confirm account access.</p>
          {w.provider === "chatgpt" && <label className="field-label">Image workshop access code<input type="password" autoComplete="off" value={w.accessCode} onChange={(e) => w.setAccessCode(e.target.value)} /></label>}
          <button className="button" disabled={w.checking} onClick={() => void w.checkConnection()}><RefreshCw size={15} /> Check image configuration</button>
          <p>Music comes from the bundled CC0 library and needs no API key.</p>
        </section>
        <div className="settings-foot"><p>{w.provider === "chatgpt" ? "Sign in to connect your ChatGPT plan, then return to the builder to create your game." : "Your workshop code stays in this tab’s memory. After a page reload, enter it again here."}</p><Link className="button primary" href="/builder">Return to builder <ArrowRight size={16} /></Link></div>
      </div>
    </div>
    <div className="settings-layout storage-explainer"><aside><h2>Game storage</h2></aside><div><h3>Saved on this browser</h3><p>Games do not sync across browsers or devices. Export a JSON backup from the editor to keep an editable copy.</p><Link href="/library">Go to My Games <ArrowRight size={14} /></Link></div></div>
  </main>;
}
