function GithubIntegration() {
  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'var(--color-accent-purple)' }}
      />

      <div className="relative z-10 p-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-medium text-[var(--color-text)] mb-1">GitHub PR integration</h1>
        <p className="text-[var(--color-text-muted)] mb-8 text-sm">
          This feature runs automatically via webhook — there's nothing to submit here, just configure it once
        </p>

        <div
          className="p-6 rounded-2xl border border-white/10 space-y-5"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
            <p className="text-[var(--color-text)] text-sm font-medium">Webhook endpoint is live</p>
          </div>

          <div>
            <p className="text-[var(--color-text-muted)] text-xs font-medium mb-1">Webhook URL</p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <code className="text-[var(--color-text)] text-sm font-mono">
                {backendUrl}/api/github/webhook
              </code>
            </div>
          </div>

          <div>
            <p className="text-[var(--color-text)] text-sm font-medium mb-2">How to connect a repo</p>
            <ol className="space-y-2 text-[var(--color-text-muted)] text-sm list-decimal list-inside">
              <li>Go to your GitHub repo → Settings → Webhooks → Add webhook</li>
              <li>Paste the webhook URL above into "Payload URL"</li>
              <li>Set content type to <code className="text-[var(--color-text)]">application/json</code></li>
              <li>Add your webhook secret (same value as <code className="text-[var(--color-text)]">GITHUB_WEBHOOK_SECRET</code> in your backend .env)</li>
              <li>Select "Pull requests" under "Which events would you like to trigger this webhook?"</li>
              <li>Save — every new PR or PR update will now trigger an automatic diff-aware review, posted as PR comments</li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[var(--color-text-muted)] text-xs">
              💡 If testing locally, expose your backend with ngrok (<code className="text-[var(--color-text)]">ngrok http 5000</code>) and use the ngrok URL + <code className="text-[var(--color-text)]">/api/github/webhook</code> as your payload URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GithubIntegration