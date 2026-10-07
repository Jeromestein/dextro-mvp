"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useConnection } from "./provider";
import { useLibrary } from "@/modules/workspace/library-provider";

export default function ConnectionSettings() {
  const w = useConnection();
  const storage = useLibrary();
  return <main className="settings-page product-page">
    <Link href="/builder" className="back-link"><ArrowLeft size={15} /> Back to builder</Link>
    <div className="page-heading"><div><span className="kicker">WORKSPACE</span><h1>Settings</h1><p>Choose the models that bring your stories to life.</p></div></div>
    <div className="settings-layout">
      <aside><h2>AI models</h2><p>Your choices apply to new generations. Existing stories and images stay as they are.</p></aside>
      <div className="settings-card">
        <section className="model-settings" aria-label="AI models">
          <label className="field-label">Story model<select disabled={w.checking || !w.storyModels.length} value={w.model} onChange={(event) => w.setModel(event.target.value)}>
            {!w.storyModels.length && <option value="">Loading models…</option>}
            {w.storyModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select></label>
          <label className="field-label">Image model<select disabled={w.checking || !w.imageModels.length} value={w.imageModel} onChange={(event) => w.setImageModel(event.target.value)}>
            {!w.imageModels.length && <option value="">Loading models…</option>}
            {w.imageModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select></label>
          <p className="quiet">Images use economy quality. Music comes from the free CC0 library.</p>
          <p role="status">{w.checking ? "Checking AI configuration…" : w.connectionError || (w.aiReady && w.imagesReady ? "Ready to generate. OpenAI API usage is billed to the studio." : "Add OPENAI_API_KEY to the server environment and restart the server to enable generation.")}</p>
        </section>
        <div className="settings-foot"><p>Model choices are remembered in this browser. Availability depends on the studio’s OpenAI account.</p><Link className="button primary" href="/builder">Return to builder <ArrowRight size={16} /></Link></div>
      </div>
    </div>
    <div className="settings-layout storage-explainer"><aside><h2>Game storage</h2></aside><div><h3>{!storage.ready ? "Checking game storage…" : !storage.available ? "Storage unavailable" : storage.cloud ? "Saved to your private cloud workspace" : "Saved in this browser"}</h3><p>{storage.cloud ? "Games and media are stored in your private cloud workspace. Export a JSON backup from the editor to keep an editable copy." : "Browser-local games do not sync across browsers or devices. Export a JSON backup from the editor to keep an editable copy."}</p>{storage.storageError && <p role="alert">{storage.storageError}</p>}<Link href="/library">Go to My Games <ArrowRight size={14} /></Link></div></div>
  </main>;
}
