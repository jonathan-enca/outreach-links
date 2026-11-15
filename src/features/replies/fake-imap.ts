import net from "node:net";

/**
 * Faux serveur IMAP local pour les tests (jamais une vraie boîte) : LOGIN, EXAMINE/SELECT,
 * UID SEARCH, UID FETCH, LOGOUT. Il consigne les commandes reçues pour prouver que la lecture
 * reste en lecture seule (aucun STORE, EXPUNGE, COPY, MOVE, APPEND).
 */
export interface FakeImap {
  server: net.Server;
  /** Ajoute un message ; renvoie son UID. */
  add(raw: string): number;
  commands: string[];
  uidValidity: number;
  port(): number;
}

export function fakeImap(user: string, pass: string, uidValidity = 42): FakeImap {
  const messages: { uid: number; raw: string }[] = [];
  const commands: string[] = [];
  const api: FakeImap = {
    server: undefined as unknown as net.Server,
    commands,
    uidValidity,
    add(raw) {
      const uid = (messages.at(-1)?.uid ?? 0) + 1;
      messages.push({ uid, raw: raw.replace(/\r?\n/g, "\r\n") });
      return uid;
    },
    port: () => (api.server.address() as net.AddressInfo).port,
  };
  api.server = net.createServer((sock) => {
    sock.write("* OK fake imap ready\r\n");
    let buf = "";
    sock.on("data", (d) => {
      buf += d.toString("latin1");
      let i: number;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const m = /^(\S+) (\S+)(?: (.*))?$/.exec(line);
        if (!m) continue;
        const [, tag, cmd, rest = ""] = m;
        commands.push(
          `${cmd.toUpperCase()}${cmd.toUpperCase() === "UID" ? " " + rest.split(" ")[0] : ""}`,
        );
        const c = cmd.toUpperCase();
        if (c === "CAPABILITY") sock.write(`* CAPABILITY IMAP4rev1\r\n${tag} OK done\r\n`);
        else if (c === "LOGIN") {
          const [u, p] = rest.split(" ").map((a) => a.replace(/^"|"$/g, ""));
          sock.write(
            u === user && p === pass ? `${tag} OK logged in\r\n` : `${tag} NO bad login\r\n`,
          );
        } else if (c === "EXAMINE" || c === "SELECT") {
          sock.write(
            `* ${messages.length} EXISTS\r\n* 0 RECENT\r\n* OK [UIDVALIDITY ${api.uidValidity}] ok\r\n` +
              `* OK [UIDNEXT ${(messages.at(-1)?.uid ?? 0) + 1}] ok\r\n* FLAGS (\\Seen)\r\n` +
              `${tag} OK [${c === "EXAMINE" ? "READ-ONLY" : "READ-WRITE"}] done\r\n`,
          );
        } else if (c === "UID" && /^SEARCH/i.test(rest)) {
          const range = /UID (\d+):(\d+|\*)/i.exec(rest);
          const from = range ? Number(range[1]) : 1;
          const uids = messages.filter((x) => x.uid >= from).map((x) => x.uid);
          sock.write(`* SEARCH ${uids.join(" ")}\r\n${tag} OK done\r\n`);
        } else if (c === "UID" && /^FETCH/i.test(rest)) {
          const set = rest.split(" ")[1]!.split(",").map(Number);
          for (const msg of messages.filter((x) => set.includes(x.uid))) {
            const seq = messages.indexOf(msg) + 1;
            const body = Buffer.from(msg.raw, "latin1");
            sock.write(
              `* ${seq} FETCH (UID ${msg.uid} INTERNALDATE "15-Nov-2026 10:00:00 +0000" ` +
                `BODY[] {${body.length}}\r\n`,
            );
            sock.write(body);
            sock.write(")\r\n");
          }
          sock.write(`${tag} OK done\r\n`);
        } else if (c === "LOGOUT") {
          sock.write(`* BYE\r\n${tag} OK bye\r\n`);
          sock.end();
        } else sock.write(`${tag} OK\r\n`);
      }
    });
  });
  return api;
}
