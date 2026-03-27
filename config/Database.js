const mongoose = require("mongoose");
const dns = require("node:dns");

const getDbUris = () => {
<<<<<<< HEAD
    const primary = process.env.MONGO_URI || process.env.MONGODB_URI;
    const fallback = process.env.MONGO_URI_FALLBACK || process.env.MONGODB_URI_FALLBACK;

    if (!primary) {
        throw new Error(
            "MongoDB connection string (MONGO_URI or MONGODB_URI) is missing in environment variables."
        );
    }

    return { primary, fallback };
};

const shouldTryFallback = (err, uri) => {
    const msg = String(err?.message || "");
    return (
        typeof uri === "string" &&
        uri.startsWith("mongodb+srv://") &&
        (msg.includes("querySrv") ||
            msg.includes("ENOTFOUND") ||
            msg.includes("EAI_AGAIN") ||
            msg.includes("ECONNREFUSED"))
    );
};

const applyDnsServersIfConfigured = () => {
    const raw = process.env.DNS_SERVERS;
    if (!raw) return false;

    const servers = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (servers.length === 0) return false;
    dns.setServers(servers);
    return true;
};

const applyDefaultDnsServersForSrv = () => {
    // Helps when the OS DNS resolver intermittently refuses SRV queries.
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
};

const connectOnce = async (dbUri) => {
    return mongoose.connect(dbUri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
    });
};

const connectDB = async () => {
    const { primary, fallback } = getDbUris();

    // If user explicitly configured DNS servers, apply them early.
    applyDnsServersIfConfigured();

    try {
        const conn = await connectOnce(primary);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return;
    } catch (err) {
        // Retry once for SRV/DNS related errors using known-good public resolvers.
        if (shouldTryFallback(err, primary) && !process.env.DNS_SERVERS) {
            try {
                applyDefaultDnsServersForSrv();
                const conn = await connectOnce(primary);
                console.log(`✅ MongoDB Connected (dns retry): ${conn.connection.host}`);
                return;
            } catch (_) {
                // fall through to fallback / final error logging
            }
        }

        const canFallback = Boolean(fallback) && shouldTryFallback(err, primary);

        if (canFallback) {
            try {
                const conn = await connectOnce(fallback);
                console.log(`✅ MongoDB Connected (fallback): ${conn.connection.host}`);
                return;
            } catch (fallbackErr) {
                console.error("MongoDB connection error (fallback):", fallbackErr?.message || fallbackErr);
            }
        }

        console.error("MongoDB connection error:", err?.message || err);

        // In local dev, keep server alive so you can still hit non-DB routes.
        // In production, failing fast is usually better.
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
    }
=======
  const primary = process.env.MONGO_URI || process.env.MONGODB_URI;
  const fallback = process.env.MONGO_URI_FALLBACK || process.env.MONGODB_URI_FALLBACK;

  if (!primary) {
    throw new Error(
      "MongoDB connection string (MONGO_URI or MONGODB_URI) is missing in environment variables."
    );
  }

  return { primary, fallback };
};

const shouldTryFallback = (err, uri) => {
  const msg = String(err?.message || "");
  return (
    typeof uri === "string" &&
    uri.startsWith("mongodb+srv://") &&
    (msg.includes("querySrv") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("EAI_AGAIN") ||
      msg.includes("ECONNREFUSED"))
  );
};

const applyDnsServersIfConfigured = () => {
  const raw = process.env.DNS_SERVERS;
  if (!raw) return false;

  const servers = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (servers.length === 0) return false;
  dns.setServers(servers);
  return true;
};

const applyDefaultDnsServersForSrv = () => {
  // Helps when the OS DNS resolver intermittently refuses SRV queries.
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
};

const connectOnce = async (dbUri) => {
  return mongoose.connect(dbUri, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
  });
};

const connectDB = async () => {
  const { primary, fallback } = getDbUris();

  // If user explicitly configured DNS servers, apply them early.
  applyDnsServersIfConfigured();

  try {
    const conn = await connectOnce(primary);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (err) {
    // Retry once for SRV/DNS related errors using known-good public resolvers.
    if (shouldTryFallback(err, primary) && !process.env.DNS_SERVERS) {
      try {
        applyDefaultDnsServersForSrv();
        const conn = await connectOnce(primary);
        console.log(`✅ MongoDB Connected (dns retry): ${conn.connection.host}`);
        return;
      } catch (_) {
        // fall through to fallback / final error logging
      }
    }

    const canFallback = Boolean(fallback) && shouldTryFallback(err, primary);

    if (canFallback) {
      try {
        const conn = await connectOnce(fallback);
        console.log(`✅ MongoDB Connected (fallback): ${conn.connection.host}`);
        return;
      } catch (fallbackErr) {
        console.error("MongoDB connection error (fallback):", fallbackErr?.message || fallbackErr);
      }
    }

    console.error("MongoDB connection error:", err?.message || err);

    // In local dev, keep server alive so you can still hit non-DB routes.
    // In production, failing fast is usually better.
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
>>>>>>> 093b684 (initial server commit)
};

module.exports = connectDB;