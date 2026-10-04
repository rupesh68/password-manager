import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export default function App() {
  const [service, setService] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [vault, setVault] = useState([]);
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Load vault from Capacitor Preferences on startup
  useEffect(() => {
    let isMounted = true;

    async function loadVault() {
      const { value } = await Preferences.get({ key: "user_vault" });
      if (isMounted && value) {
        try {
          setVault(JSON.parse(value));
        } catch (e) {
          console.error("Failed to parse vault data:", e);
        }
      }
    }

    loadVault();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveVaultToDevice = async (updatedVault) => {
    setVault(updatedVault);
    await Preferences.set({
      key: "user_vault",
      value: JSON.stringify(updatedVault),
    });
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    if (!service.trim() || !password.trim()) return;

    const newItem = {
      id: Date.now(),
      service: service.trim(),
      username: username.trim() || "-",
      password: password.trim(),
      createdAt: new Date().toLocaleDateString(),
    };

    const updated = [newItem, ...vault];
    await saveVaultToDevice(updated);
    setService("");
    setUsername("");
    setPassword("");
  };

  const handleDelete = async (id) => {
    const updated = vault.filter((item) => item.id !== id);
    await saveVaultToDevice(updated);
  };

  const toggleVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy password with web & native fallback
  const handleCopyPassword = async (id, pwd) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pwd);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = pwd;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  // Modern Export CSV handler (Supports Android WebView Share & Desktop Download)
  const handleDownloadCSV = async () => {
    if (vault.length === 0) {
      alert("No passwords to export!");
      return;
    }

    let csvContent = "Service,Username,Password,Date Added\n";
    vault.forEach((item) => {
      const escapedService = `"${item.service.replace(/"/g, '""')}"`;
      const escapedUsername = `"${(item.username || "").replace(/"/g, '""')}"`;
      const escapedPassword = `"${item.password.replace(/"/g, '""')}"`;
      csvContent += `${escapedService},${escapedUsername},${escapedPassword},${item.createdAt}\n`;
    });

    const fileName = `passwords_backup_${Date.now()}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const file = new File([blob], fileName, { type: "text/csv" });

    // 1. Android / Mobile Native Share (opens system sheet to save/send file)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Passwords Backup",
          text: "Exported password manager vault backup CSV",
          files: [file],
        });
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        } else {
          return; // User dismissed native share sheet
        }
      }
    }

    // 2. Fallback for Desktop Browsers
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center p-4 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
              🔐 Password Manager
            </h1>
           
          </div>
          <button
            onClick={handleDownloadCSV}
            className="bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-emerald-400 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleAddPassword}
          className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 space-y-4 shadow-xl backdrop-blur-sm"
        >
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Add New Account
          </h2>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Service Name
            </label>
            <input
              type="text"
              placeholder="e.g. Instagram, Netflix"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-600 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Username / Email
            </label>
            <input
              type="text"
              placeholder="e.g. @username or email@domain.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-600 transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-bold py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer"
          >
            Save Account
          </button>
        </form>

        {/* Stored Accounts List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Stored Accounts ({vault.length})
            </h2>
          </div>

          {vault.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-sm font-medium text-zinc-500">
                No accounts saved yet.
              </p>
            </div>
          ) : (
            vault.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800/80 flex justify-between items-center shadow-md hover:border-zinc-700 transition-all"
              >
                <div className="space-y-0.5 max-w-[48%]">
                  <p className="font-bold text-white text-sm truncate">
                    {item.service}
                  </p>
                  {item.username && item.username !== "-" && (
                    <p className="text-xs text-zinc-400 truncate font-medium">
                      {item.username}
                    </p>
                  )}
                  <p className="text-xs font-mono text-emerald-400 font-semibold pt-0.5">
                    {showPasswords[item.id] ? item.password : "••••••••••••"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyPassword(item.id, item.password)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      copiedId === item.id
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60"
                    }`}
                  >
                    {copiedId === item.id ? "✓ Copied" : "Copy"}
                  </button>

                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700/60 transition cursor-pointer"
                  >
                    {showPasswords[item.id] ? "Hide" : "Show"}
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg border border-rose-900/30 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}