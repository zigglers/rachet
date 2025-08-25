// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { exec } from "child_process";
import { promisify } from "util";
import * as http from "http";
import { platform } from "os";
import * as url from "url";
var execAsync = promisify(exec);
async function openUrl(urlToOpen) {
  const os = platform();
  let command;
  switch (os) {
    case "darwin":
      command = `open "${urlToOpen}"`;
      break;
    case "win32":
      command = `start "" "${urlToOpen}"`;
      break;
    default:
      command = `xdg-open "${urlToOpen}"`;
      break;
  }
  try {
    await execAsync(command);
  } catch (error) {
    console.log(`Please open this URL in your browser: ${urlToOpen}`);
  }
}
async function createCallbackServer() {
  return new Promise((resolve) => {
    let tokenResolve;
    const tokenPromise = new Promise((res) => {
      tokenResolve = res;
    });
    const server = http.createServer((req, res) => {
      const reqUrl = url.parse(req.url || "", true);
      if (reqUrl.pathname === "/callback") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Spotify Authorization</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
              }
              h1 { margin-bottom: 1rem; }
              .success { color: #4ade80; font-size: 3rem; }
              .error { color: #f87171; }
              .close { 
                margin-top: 2rem;
                padding: 0.5rem 1rem;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div id="status">Processing...</div>
            </div>
            <script>
              // Extract token from URL fragment
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              const token = params.get('access_token');
              const error = params.get('error');
              
              const statusEl = document.getElementById('status');
              
              if (token) {
                // Send token to server
                fetch('/save-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                }).then(() => {
                  statusEl.innerHTML = \`
                    <div class="success">\u2713</div>
                    <h1>Authorization Successful!</h1>
                    <p>You can close this window and return to the terminal.</p>
                    <button class="close" onclick="window.close()">Close Window</button>
                  \`;
                  setTimeout(() => window.close(), 3000);
                });
              } else if (error) {
                statusEl.innerHTML = \`
                  <h1 class="error">Authorization Failed</h1>
                  <p>\${error}</p>
                  <button class="close" onclick="window.close()">Close Window</button>
                \`;
              } else {
                statusEl.innerHTML = \`
                  <h1 class="error">No Token Received</h1>
                  <p>Please try again.</p>
                  <button class="close" onclick="window.close()">Close Window</button>
                \`;
              }
            </script>
          </body>
          </html>
        `);
      } else if (reqUrl.pathname === "/save-token" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const { token } = JSON.parse(body);
            if (token) {
              tokenResolve(token);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "No token provided" }));
            }
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request" }));
          }
        });
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(8888, () => {
      resolve({ server, tokenPromise });
    });
  });
}
async function initiateOAuthFlow(clientId, context) {
  const scopes = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "playlist-modify-public",
    "playlist-modify-private",
    "playlist-read-private",
    "user-library-modify",
    "user-library-read"
  ].join(" ");
  const redirectUri = "http://localhost:8888/callback";
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("response_type", "token");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("show_dialog", "true");
  return authUrl.toString();
}
async function getUserToken(clientId, clientSecret, context) {
  var _a, _b, _c, _d, _e;
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
    const settingsData = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(settingsData);
    let token = (_b = (_a = settings == null ? void 0 : settings.tools) == null ? void 0 : _a.spotify) == null ? void 0 : _b.userToken;
    if ((_d = (_c = settings == null ? void 0 : settings.tools) == null ? void 0 : _c.spotify) == null ? void 0 : _d.refreshToken) {
      const refreshToken = settings.tools.spotify.refreshToken;
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        });
        if (response.ok) {
          const data = await response.json();
          token = data.access_token;
          settings.tools.spotify.userToken = token;
          if (data.refresh_token) {
            settings.tools.spotify.refreshToken = data.refresh_token;
          }
          await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
          return token;
        }
      } catch (error) {
        (_e = context.logger) == null ? void 0 : _e.debug("Failed to refresh token:", error);
      }
    }
    return token || null;
  } catch {
    return null;
  }
}
async function addToQueue(trackUri, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to add to queue: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getQueue(userToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/queue", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get queue: ${error}` };
    }
    const queue = await response.json();
    return { success: true, queue };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function saveTrack(trackId, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to save track: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function removeTrack(trackId, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to remove track: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function checkSavedTracks(trackIds, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(",")}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to check saved tracks: ${error}` };
    }
    const saved = await response.json();
    return { success: true, saved };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function skipToNext(userToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/next", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      return { success: false, error: `Failed to skip track: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getSavedTracks(limit, offset, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get saved tracks: ${error}` };
    }
    const tracks = await response.json();
    return { success: true, tracks };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getUserPlaylists(limit, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get playlists: ${error}` };
    }
    const playlists = await response.json();
    return { success: true, playlists };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getPlaylistTracks(playlistId, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get playlist tracks: ${error}` };
    }
    const tracks = await response.json();
    return { success: true, tracks };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function removeFromPlaylist(playlistId, trackUris, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tracks: trackUris.map((uri) => ({ uri }))
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to remove from playlist: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getPlaybackState(userToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (response.status === 204) {
      return { success: true, state: null };
    }
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get playback state: ${error}` };
    }
    const state = await response.json();
    return { success: true, state };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function setRepeatMode(mode, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to set repeat mode: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function setShuffleMode(state, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to set shuffle mode: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function seekToPosition(position, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to seek: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getDevices(userToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get devices: ${error}` };
    }
    const data = await response.json();
    return { success: true, devices: data.devices };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function transferPlayback(deviceId, play, userToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to transfer playback: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getRecentlyPlayed(limit, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get recently played: ${error}` };
    }
    const data = await response.json();
    return { success: true, items: data.items };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getTopItems(type, limit, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get top ${type}: ${error}` };
    }
    const data = await response.json();
    return { success: true, items: data.items };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getRecommendations(seedTracks, seedArtists, seedGenres, limit, accessToken) {
  try {
    const url2 = new URL("https://api.spotify.com/v1/recommendations");
    if (seedTracks.length > 0) url2.searchParams.append("seed_tracks", seedTracks.join(","));
    if (seedArtists.length > 0) url2.searchParams.append("seed_artists", seedArtists.join(","));
    if (seedGenres.length > 0) url2.searchParams.append("seed_genres", seedGenres.join(","));
    url2.searchParams.append("limit", limit.toString());
    const response = await fetch(url2.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get recommendations: ${error}` };
    }
    const data = await response.json();
    return { success: true, tracks: data.tracks };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getAvailableGenres(accessToken) {
  try {
    const response = await fetch("https://api.spotify.com/v1/recommendations/available-genre-seeds", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get genres: ${error}` };
    }
    const data = await response.json();
    return { success: true, genres: data.genres };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getNewReleases(limit, accessToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get new releases: ${error}` };
    }
    const data = await response.json();
    return { success: true, albums: data.albums.items };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getFeaturedPlaylists(limit, accessToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/browse/featured-playlists?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get featured playlists: ${error}` };
    }
    const data = await response.json();
    return { success: true, playlists: data.playlists.items, message: data.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function getAudioFeatures(trackId, accessToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get audio features: ${error}` };
    }
    const features = await response.json();
    return { success: true, features };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function searchSpotify(query, types, limit, accessToken) {
  try {
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("type", types.join(","));
    searchUrl.searchParams.append("limit", limit.toString());
    const response = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Search failed: ${error}` };
    }
    const results = await response.json();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function createPlaylist(name, description, userToken) {
  try {
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${userToken}`
      }
    });
    if (!userResponse.ok) {
      return { success: false, error: "Failed to get user information" };
    }
    const user = await userResponse.json();
    const userId = user.id;
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to create playlist: ${error}` };
    }
    const playlist = await response.json();
    return { success: true, playlist };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function addToPlaylist(playlistId, trackUris, userToken) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uris: trackUris
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to add to playlist: ${error}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
async function controlSpotify(action) {
  const platform2 = process.platform;
  try {
    let command;
    switch (platform2) {
      case "darwin":
        switch (action) {
          case "play":
            command = `osascript -e 'tell application "Spotify" to play'`;
            break;
          case "pause":
            command = `osascript -e 'tell application "Spotify" to pause'`;
            break;
          case "next":
            command = `osascript -e 'tell application "Spotify" to next track'`;
            break;
          case "previous":
            command = `osascript -e 'tell application "Spotify" to previous track'`;
            break;
          case "volume-up":
            command = `osascript -e 'tell application "Spotify" to set sound volume to (sound volume + 10)'`;
            break;
          case "volume-down":
            command = `osascript -e 'tell application "Spotify" to set sound volume to (sound volume - 10)'`;
            break;
          case "current":
            command = `osascript -e '
              tell application "Spotify"
                set trackName to name of current track
                set artistName to artist of current track
                set albumName to album of current track
                return trackName & " by " & artistName & " from " & albumName
              end tell'`;
            break;
          default:
            return { success: false, error: `Unknown action: ${action}` };
        }
        break;
      case "linux":
        switch (action) {
          case "play":
            command = "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Play";
            break;
          case "pause":
            command = "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Pause";
            break;
          case "next":
            command = "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Next";
            break;
          case "previous":
            command = "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Previous";
            break;
          default:
            return { success: false, error: `Action "${action}" not supported on Linux yet` };
        }
        break;
      case "win32":
        return {
          success: false,
          error: "Windows playback control not yet implemented. Please use the Spotify Web API."
        };
      default:
        return { success: false, error: `Platform ${platform2} not supported` };
    }
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes("WARNING")) {
      return { success: false, error: stderr };
    }
    return {
      success: true,
      output: stdout.trim() || `Successfully executed: ${action}`
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to control Spotify: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
var index_default = createTool().id("spotify-tool").name("Spotify Tool").description("Search for songs on Spotify, control playback, and open tracks in the Spotify app").category(ToolCategory.Utility).capabilities(ToolCapability.NetworkAccess, ToolCapability.SystemExecute).tags("spotify", "music", "player", "search", "api", "control", "playback").stringArg("action", "Action to perform - see examples for full list", {
  required: false,
  default: "search",
  validate: (value) => {
    const validActions = [
      // Search
      "search",
      "search-albums",
      "search-artists",
      "search-playlists",
      "search-shows",
      "search-episodes",
      // Playback Control
      "play",
      "pause",
      "next",
      "previous",
      "current",
      "volume-up",
      "volume-down",
      "seek",
      "repeat",
      "shuffle",
      "playback-state",
      "devices",
      "transfer",
      // Queue Management  
      "queue",
      "add-to-queue",
      "clear-queue",
      // Library Management
      "like",
      "unlike",
      "check-saved",
      "saved-tracks",
      // Playlist Management
      "playlists",
      "playlist-tracks",
      "create-playlist",
      "add-to-playlist",
      "remove-from-playlist",
      // User Profile
      "recently-played",
      "top-tracks",
      "top-artists",
      // Discovery & Recommendations
      "recommendations",
      "new-releases",
      "featured-playlists",
      "available-genres",
      "audio-features",
      // Authorization
      "authorize"
    ];
    if (!validActions.includes(value)) {
      return `Invalid action. Valid actions are: ${validActions.join(", ")}`;
    }
    return true;
  }
}).stringArg("query", "The song, artist, or album to search for (required for search action)", {
  required: false,
  validate: (value) => {
    if (value.length < 2) {
      return "Search query must be at least 2 characters";
    }
    return true;
  }
}).stringArg("clientId", "Spotify API Client ID", {
  required: false
}).stringArg("clientSecret", "Spotify API Client Secret", {
  required: false
}).numberArg("limit", "Number of results to return", {
  default: 5,
  validate: (value) => {
    if (value < 1 || value > 50) {
      return "Limit must be between 1 and 50";
    }
    return true;
  }
}).booleanArg("openFirst", "Automatically open the first result in Spotify", {
  default: false
}).booleanArg("showUrl", "Show Spotify web URLs in results", {
  default: false
}).stringArg("trackId", "Track ID for like/add-to-queue actions", {
  required: false
}).stringArg("trackUri", "Track URI for add-to-queue action", {
  required: false
}).stringArg("playlistName", "Name for new playlist", {
  required: false
}).stringArg("playlistDescription", "Description for new playlist", {
  required: false,
  default: ""
}).stringArg("playlistId", "Playlist ID to add tracks to", {
  required: false
}).stringArg("userToken", "Spotify user access token for user-specific actions", {
  required: false
}).numberArg("position", "Position in queue (for remove-from-queue) or milliseconds (for seek)", {
  required: false
}).stringArg("deviceId", "Device ID for transfer playback", {
  required: false
}).stringArg("repeatMode", "Repeat mode: off, track, or context", {
  required: false,
  default: "off"
}).booleanArg("shuffleState", "Enable or disable shuffle", {
  required: false,
  default: false
}).numberArg("offset", "Offset for paginated results", {
  required: false,
  default: 0
}).stringArg("searchType", "Type of search: track, album, artist, playlist, show, episode", {
  required: false,
  default: "track"
}).stringArg("timeRange", "Time range for top items: short_term, medium_term, long_term", {
  required: false,
  default: "medium_term"
}).stringArg("seedTracks", "Comma-separated track IDs for recommendations", {
  required: false
}).stringArg("seedArtists", "Comma-separated artist IDs for recommendations", {
  required: false
}).stringArg("seedGenres", "Comma-separated genres for recommendations", {
  required: false
}).onInitialize(async (context) => {
  var _a;
  (_a = context.logger) == null ? void 0 : _a.debug("Spotify tool initialized");
}).execute(async (args, context) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da;
  let {
    action = "search",
    query,
    clientId,
    clientSecret,
    limit = 5,
    openFirst = false,
    showUrl = false,
    trackId,
    trackUri,
    playlistName,
    playlistDescription = "",
    playlistId,
    userToken,
    position,
    deviceId,
    repeatMode = "off",
    shuffleState = false,
    offset = 0,
    searchType = "track",
    timeRange = "medium_term",
    seedTracks,
    seedArtists,
    seedGenres
  } = args;
  try {
    if (action === "authorize") {
      if (!clientId || !clientSecret) {
        try {
          const fs = await import("fs/promises");
          const path = await import("path");
          const os = await import("os");
          const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
          const settingsData = await fs.readFile(settingsPath, "utf-8");
          const settings = JSON.parse(settingsData);
          const spotifySettings = (_a = settings == null ? void 0 : settings.tools) == null ? void 0 : _a.spotify;
          if (spotifySettings) {
            if (spotifySettings.clientId && !clientId) {
              clientId = spotifySettings.clientId;
            }
            if (spotifySettings.clientSecret && !clientSecret) {
              clientSecret = spotifySettings.clientSecret;
            }
          }
        } catch (error) {
          (_b = context.logger) == null ? void 0 : _b.debug("Could not read settings:", error);
        }
      }
      if (!clientId) {
        return {
          success: false,
          error: "Client ID is required for authorization. Please provide it or set it in settings."
        };
      }
      try {
        (_c = context.logger) == null ? void 0 : _c.info("Starting authorization server on http://localhost:8888");
        const { server, tokenPromise } = await createCallbackServer();
        const authUrl = await initiateOAuthFlow(clientId, context);
        (_d = context.logger) == null ? void 0 : _d.info("Opening Spotify authorization in browser...");
        await openUrl(authUrl);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Authorization timeout")), 12e4);
        });
        try {
          const token = await Promise.race([tokenPromise, timeoutPromise]);
          const fs = await import("fs/promises");
          const path = await import("path");
          const os = await import("os");
          const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
          let settings = {};
          try {
            const settingsData = await fs.readFile(settingsPath, "utf-8");
            settings = JSON.parse(settingsData);
          } catch {
          }
          if (!settings.tools) settings.tools = {};
          if (!settings.tools.spotify) settings.tools.spotify = {};
          settings.tools.spotify.userToken = token;
          await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
          server.close();
          return {
            success: true,
            output: `\u2705 Authorization successful!

Your Spotify access token has been saved to settings.
You can now use all Spotify features including:
\u2022 View and manage queue
\u2022 Like/save songs
\u2022 Create and manage playlists

Try: "Show my Spotify queue" or "Like this song"`
          };
        } catch (error) {
          server.close();
          if (error instanceof Error && error.message === "Authorization timeout") {
            return {
              success: false,
              error: "Authorization timed out. Please try again."
            };
          }
          throw error;
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to complete authorization: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    const userActions = [
      "queue",
      "add-to-queue",
      "clear-queue",
      "remove-from-queue",
      "like",
      "unlike",
      "check-saved",
      "saved-tracks",
      "create-playlist",
      "add-to-playlist",
      "remove-from-playlist",
      "playlists",
      "playlist-tracks",
      "recently-played",
      "top-tracks",
      "top-artists",
      "playback-state",
      "devices",
      "transfer",
      "seek",
      "repeat",
      "shuffle",
      "search-albums",
      "search-artists",
      "search-playlists",
      "search-shows",
      "search-episodes"
    ];
    if (userActions.includes(action)) {
      if (!clientId || !clientSecret) {
        try {
          const fs = await import("fs/promises");
          const path = await import("path");
          const os = await import("os");
          const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
          const settingsData = await fs.readFile(settingsPath, "utf-8");
          const settings = JSON.parse(settingsData);
          const spotifySettings = (_e = settings == null ? void 0 : settings.tools) == null ? void 0 : _e.spotify;
          if (spotifySettings) {
            if (spotifySettings.clientId && !clientId) {
              clientId = spotifySettings.clientId;
            }
            if (spotifySettings.clientSecret && !clientSecret) {
              clientSecret = spotifySettings.clientSecret;
            }
          }
        } catch (error) {
          (_f = context.logger) == null ? void 0 : _f.debug("Could not read settings for OAuth:", error);
        }
      }
      if (!userToken && clientId && clientSecret) {
        userToken = await getUserToken(clientId, clientSecret, context);
      }
      if (!userToken) {
        if (!clientId) {
          return {
            success: false,
            error: `${action} requires Spotify API credentials. Please provide clientId and clientSecret.`
          };
        }
        const authUrl = await initiateOAuthFlow(clientId, context);
        return {
          success: false,
          error: `${action} requires user authentication. Please authorize the app:

1. Open this URL in your browser:
   ${authUrl}

2. After authorizing, you'll be redirected to a URL like:
   http://localhost:8888/callback#access_token=YOUR_TOKEN&...

3. Copy the access_token value from the URL

4. Run this command again with userToken argument:
   --userToken "YOUR_TOKEN"

Or save it to settings for automatic use.`
        };
      }
      switch (action) {
        case "queue": {
          const result = await getQueue(userToken);
          if (!result.success) {
            return result;
          }
          let output2 = "Current Queue:\n\n";
          if ((_g = result.queue) == null ? void 0 : _g.currently_playing) {
            const current = result.queue.currently_playing;
            output2 += `Now Playing:
`;
            output2 += `  ${current.name} by ${current.artists.map((a) => a.name).join(", ")}

`;
          }
          if (((_h = result.queue) == null ? void 0 : _h.queue) && result.queue.queue.length > 0) {
            output2 += "Up Next:\n";
            result.queue.queue.slice(0, 10).forEach((track, index) => {
              output2 += `  ${index + 1}. ${track.name} by ${track.artists.map((a) => a.name).join(", ")}
`;
            });
            if (result.queue.queue.length > 10) {
              output2 += `  ... and ${result.queue.queue.length - 10} more tracks
`;
            }
          } else {
            output2 += "Queue is empty\n";
          }
          return { success: true, output: output2 };
        }
        case "add-to-queue": {
          if (!trackUri) {
            return { success: false, error: "trackUri is required for add-to-queue action" };
          }
          const result = await addToQueue(trackUri, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Added track to queue` };
        }
        case "like": {
          if (!trackId) {
            return { success: false, error: "trackId is required for like action" };
          }
          const result = await saveTrack(trackId, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Saved track to your library` };
        }
        case "create-playlist": {
          if (!playlistName) {
            return { success: false, error: "playlistName is required for create-playlist action" };
          }
          const result = await createPlaylist(playlistName, playlistDescription, userToken);
          if (!result.success) {
            return result;
          }
          return {
            success: true,
            output: `\u2713 Created playlist "${playlistName}"
Playlist ID: ${(_i = result.playlist) == null ? void 0 : _i.id}
URL: ${(_j = result.playlist) == null ? void 0 : _j.external_urls.spotify}`
          };
        }
        case "add-to-playlist": {
          if (!playlistId || !trackUri) {
            return { success: false, error: "playlistId and trackUri are required for add-to-playlist action" };
          }
          const trackUris = trackUri.includes(",") ? trackUri.split(",").map((u) => u.trim()) : [trackUri];
          const result = await addToPlaylist(playlistId, trackUris, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Added ${trackUris.length} track(s) to playlist` };
        }
        case "clear-queue": {
          const queueResult = await getQueue(userToken);
          if (!queueResult.success || !((_k = queueResult.queue) == null ? void 0 : _k.queue)) {
            return { success: false, error: "Failed to get current queue" };
          }
          let skipped = 0;
          for (let i = 0; i < queueResult.queue.queue.length; i++) {
            const result = await skipToNext(userToken);
            if (!result.success) break;
            skipped++;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          return { success: true, output: `\u2713 Cleared ${skipped} tracks from queue` };
        }
        case "remove-from-queue": {
          if (position === void 0) {
            return { success: false, error: "position is required for remove-from-queue action" };
          }
          return {
            success: false,
            error: "Spotify API does not support removing specific items from queue. You can only skip tracks or clear the entire queue."
          };
        }
        case "unlike": {
          if (!trackId) {
            return { success: false, error: "trackId is required for unlike action" };
          }
          const result = await removeTrack(trackId, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Removed track from your library` };
        }
        case "check-saved": {
          if (!trackId) {
            return { success: false, error: "trackId is required for check-saved action" };
          }
          const trackIds = trackId.includes(",") ? trackId.split(",").map((id) => id.trim()) : [trackId];
          const result = await checkSavedTracks(trackIds, userToken);
          if (!result.success) {
            return result;
          }
          let output2 = "Track saved status:\n";
          trackIds.forEach((id, index) => {
            var _a2;
            output2 += `  ${id}: ${((_a2 = result.saved) == null ? void 0 : _a2[index]) ? "\u2713 Saved" : "\u2717 Not saved"}
`;
          });
          return { success: true, output: output2 };
        }
        case "saved-tracks": {
          const result = await getSavedTracks(limit, offset, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.tracks || result.tracks.length === 0) {
            return { success: true, output: "No saved tracks found" };
          }
          let output2 = `Saved tracks (${result.tracks.length}):

`;
          result.tracks.forEach((item, index) => {
            const track = item.track;
            output2 += `${offset + index + 1}. ${track.name}
`;
            output2 += `   Artist: ${track.artists.map((a) => a.name).join(", ")}
`;
            output2 += `   Album: ${track.album.name}
`;
            output2 += `   ID: ${track.id}

`;
          });
          return { success: true, output: output2 };
        }
        case "playlists": {
          const result = await getUserPlaylists(limit, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.playlists || result.playlists.length === 0) {
            return { success: true, output: "No playlists found" };
          }
          let output2 = `Your playlists (${result.playlists.length}):

`;
          result.playlists.forEach((playlist, index) => {
            output2 += `${index + 1}. ${playlist.name}
`;
            output2 += `   ID: ${playlist.id}
`;
            output2 += `   Tracks: ${playlist.tracks.total}
`;
            output2 += `   Public: ${playlist.public ? "Yes" : "No"}
`;
            if (playlist.description) {
              output2 += `   Description: ${playlist.description}
`;
            }
            output2 += `   URL: ${playlist.external_urls.spotify}

`;
          });
          return { success: true, output: output2 };
        }
        case "playlist-tracks": {
          if (!playlistId) {
            return { success: false, error: "playlistId is required for playlist-tracks action" };
          }
          const result = await getPlaylistTracks(playlistId, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.tracks || result.tracks.length === 0) {
            return { success: true, output: "No tracks in playlist" };
          }
          let output2 = `Playlist tracks (${result.tracks.length}):

`;
          result.tracks.forEach((item, index) => {
            const track = item.track;
            if (track) {
              output2 += `${index + 1}. ${track.name}
`;
              output2 += `   Artist: ${track.artists.map((a) => a.name).join(", ")}
`;
              output2 += `   Album: ${track.album.name}
`;
              output2 += `   URI: ${track.uri}

`;
            }
          });
          return { success: true, output: output2 };
        }
        case "remove-from-playlist": {
          if (!playlistId || !trackUri) {
            return { success: false, error: "playlistId and trackUri are required for remove-from-playlist action" };
          }
          const trackUris = trackUri.includes(",") ? trackUri.split(",").map((u) => u.trim()) : [trackUri];
          const result = await removeFromPlaylist(playlistId, trackUris, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Removed ${trackUris.length} track(s) from playlist` };
        }
        case "recently-played": {
          const result = await getRecentlyPlayed(limit, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.items || result.items.length === 0) {
            return { success: true, output: "No recently played tracks" };
          }
          let output2 = `Recently played (${result.items.length}):

`;
          result.items.forEach((item, index) => {
            const track = item.track;
            output2 += `${index + 1}. ${track.name}
`;
            output2 += `   Artist: ${track.artists.map((a) => a.name).join(", ")}
`;
            output2 += `   Album: ${track.album.name}
`;
            output2 += `   Played at: ${new Date(item.played_at).toLocaleString()}

`;
          });
          return { success: true, output: output2 };
        }
        case "top-tracks": {
          const result = await getTopItems("tracks", limit, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.items || result.items.length === 0) {
            return { success: true, output: "No top tracks found" };
          }
          let output2 = `Your top tracks (${timeRange}):

`;
          result.items.forEach((track, index) => {
            output2 += `${index + 1}. ${track.name}
`;
            output2 += `   Artist: ${track.artists.map((a) => a.name).join(", ")}
`;
            output2 += `   Album: ${track.album.name}
`;
            output2 += `   ID: ${track.id}

`;
          });
          return { success: true, output: output2 };
        }
        case "top-artists": {
          const result = await getTopItems("artists", limit, userToken);
          if (!result.success) {
            return result;
          }
          if (!result.items || result.items.length === 0) {
            return { success: true, output: "No top artists found" };
          }
          let output2 = `Your top artists (${timeRange}):

`;
          result.items.forEach((artist, index) => {
            output2 += `${index + 1}. ${artist.name}
`;
            output2 += `   Genres: ${artist.genres.join(", ") || "N/A"}
`;
            output2 += `   Followers: ${artist.followers.total.toLocaleString()}
`;
            output2 += `   URL: ${artist.external_urls.spotify}

`;
          });
          return { success: true, output: output2 };
        }
        case "playback-state": {
          const result = await getPlaybackState(userToken);
          if (!result.success) {
            return result;
          }
          if (!result.state) {
            return { success: true, output: "No active playback" };
          }
          const state = result.state;
          let output2 = "Playback State:\n\n";
          if (state.item) {
            output2 += `Currently Playing: ${state.item.name}
`;
            output2 += `Artist: ${state.item.artists.map((a) => a.name).join(", ")}
`;
            output2 += `Album: ${state.item.album.name}
`;
          }
          output2 += `
Status: ${state.is_playing ? "\u25B6\uFE0F Playing" : "\u23F8\uFE0F Paused"}
`;
          output2 += `Progress: ${Math.floor(state.progress_ms / 1e3)}s / ${Math.floor(((_l = state.item) == null ? void 0 : _l.duration_ms) / 1e3)}s
`;
          output2 += `Shuffle: ${state.shuffle_state ? "On" : "Off"}
`;
          output2 += `Repeat: ${state.repeat_state}
`;
          output2 += `Volume: ${(_m = state.device) == null ? void 0 : _m.volume_percent}%
`;
          output2 += `Device: ${(_n = state.device) == null ? void 0 : _n.name} (${(_o = state.device) == null ? void 0 : _o.type})
`;
          return { success: true, output: output2 };
        }
        case "devices": {
          const result = await getDevices(userToken);
          if (!result.success) {
            return result;
          }
          if (!result.devices || result.devices.length === 0) {
            return { success: true, output: "No devices found" };
          }
          let output2 = `Available devices (${result.devices.length}):

`;
          result.devices.forEach((device, index) => {
            output2 += `${index + 1}. ${device.name}
`;
            output2 += `   ID: ${device.id}
`;
            output2 += `   Type: ${device.type}
`;
            output2 += `   Active: ${device.is_active ? "Yes" : "No"}
`;
            output2 += `   Volume: ${device.volume_percent}%

`;
          });
          return { success: true, output: output2 };
        }
        case "transfer": {
          if (!deviceId) {
            return { success: false, error: "deviceId is required for transfer action" };
          }
          const result = await transferPlayback(deviceId, true, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Transferred playback to device ${deviceId}` };
        }
        case "seek": {
          if (position === void 0) {
            return { success: false, error: "position (in milliseconds) is required for seek action" };
          }
          const result = await seekToPosition(position, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Seeked to position ${position}ms` };
        }
        case "repeat": {
          const result = await setRepeatMode(repeatMode, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Set repeat mode to ${repeatMode}` };
        }
        case "shuffle": {
          const result = await setShuffleMode(shuffleState, userToken);
          if (!result.success) {
            return result;
          }
          return { success: true, output: `\u2713 Set shuffle to ${shuffleState ? "on" : "off"}` };
        }
        case "search-albums":
        case "search-artists":
        case "search-playlists":
        case "search-shows":
        case "search-episodes": {
          if (!query) {
            return {
              success: false,
              error: `Query is required for ${action}`
            };
          }
          const typeMap = {
            "search-albums": "album",
            "search-artists": "artist",
            "search-playlists": "playlist",
            "search-shows": "show",
            "search-episodes": "episode"
          };
          const searchTypes = [typeMap[action]];
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_q = (_p = settings == null ? void 0 : settings.tools) == null ? void 0 : _p.spotify) == null ? void 0 : _q.clientId) && ((_s = (_r = settings == null ? void 0 : settings.tools) == null ? void 0 : _r.spotify) == null ? void 0 : _s.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const result = await searchSpotify(query, searchTypes, limit, accessToken2);
          if (!result.success) {
            return result;
          }
          let output2 = "";
          const type = typeMap[action];
          if (type === "album" && ((_t = result.results) == null ? void 0 : _t.albums)) {
            const albums = result.results.albums.items;
            output2 = `Found ${albums.length} albums:

`;
            albums.forEach((album, index) => {
              output2 += `${index + 1}. ${album.name}
`;
              output2 += `   Artist: ${album.artists.map((a) => a.name).join(", ")}
`;
              output2 += `   Release: ${album.release_date}
`;
              output2 += `   Tracks: ${album.total_tracks}
`;
              output2 += `   ID: ${album.id}
`;
              output2 += `   URL: ${album.external_urls.spotify}

`;
            });
          } else if (type === "artist" && ((_u = result.results) == null ? void 0 : _u.artists)) {
            const artists = result.results.artists.items;
            output2 = `Found ${artists.length} artists:

`;
            artists.forEach((artist, index) => {
              var _a2, _b2, _c2;
              output2 += `${index + 1}. ${artist.name}
`;
              output2 += `   Genres: ${((_a2 = artist.genres) == null ? void 0 : _a2.join(", ")) || "N/A"}
`;
              output2 += `   Followers: ${((_c2 = (_b2 = artist.followers) == null ? void 0 : _b2.total) == null ? void 0 : _c2.toLocaleString()) || "N/A"}
`;
              output2 += `   ID: ${artist.id}
`;
              output2 += `   URL: ${artist.external_urls.spotify}

`;
            });
          } else if (type === "playlist" && ((_v = result.results) == null ? void 0 : _v.playlists)) {
            const playlists = result.results.playlists.items;
            output2 = `Found ${playlists.length} playlists:

`;
            playlists.forEach((playlist, index) => {
              output2 += `${index + 1}. ${playlist.name}
`;
              output2 += `   Owner: ${playlist.owner.display_name}
`;
              output2 += `   Tracks: ${playlist.tracks.total}
`;
              if (playlist.description) {
                output2 += `   Description: ${playlist.description}
`;
              }
              output2 += `   ID: ${playlist.id}
`;
              output2 += `   URL: ${playlist.external_urls.spotify}

`;
            });
          } else if (type === "show" && ((_w = result.results) == null ? void 0 : _w.shows)) {
            const shows = result.results.shows.items;
            output2 = `Found ${shows.length} shows:

`;
            shows.forEach((show, index) => {
              output2 += `${index + 1}. ${show.name}
`;
              output2 += `   Publisher: ${show.publisher}
`;
              if (show.description) {
                output2 += `   Description: ${show.description.substring(0, 100)}...
`;
              }
              output2 += `   ID: ${show.id}
`;
              output2 += `   URL: ${show.external_urls.spotify}

`;
            });
          } else if (type === "episode" && ((_x = result.results) == null ? void 0 : _x.episodes)) {
            const episodes = result.results.episodes.items;
            output2 = `Found ${episodes.length} episodes:

`;
            episodes.forEach((episode, index) => {
              var _a2;
              output2 += `${index + 1}. ${episode.name}
`;
              output2 += `   Show: ${((_a2 = episode.show) == null ? void 0 : _a2.name) || "N/A"}
`;
              output2 += `   Duration: ${Math.floor(episode.duration_ms / 6e4)} min
`;
              output2 += `   Release: ${episode.release_date}
`;
              output2 += `   ID: ${episode.id}
`;
              output2 += `   URL: ${episode.external_urls.spotify}

`;
            });
          } else {
            output2 = "No results found";
          }
          return { success: true, output: output2 };
        }
        case "recommendations": {
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_z = (_y = settings == null ? void 0 : settings.tools) == null ? void 0 : _y.spotify) == null ? void 0 : _z.clientId) && ((_B = (_A = settings == null ? void 0 : settings.tools) == null ? void 0 : _A.spotify) == null ? void 0 : _B.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const tracks2 = seedTracks ? seedTracks.split(",").map((t) => t.trim()) : [];
          const artists = seedArtists ? seedArtists.split(",").map((a) => a.trim()) : [];
          const genres = seedGenres ? seedGenres.split(",").map((g) => g.trim()) : [];
          if (tracks2.length === 0 && artists.length === 0 && genres.length === 0) {
            return {
              success: false,
              error: "At least one seed (seedTracks, seedArtists, or seedGenres) is required for recommendations"
            };
          }
          const result = await getRecommendations(tracks2, artists, genres, limit, accessToken2);
          if (!result.success) {
            return result;
          }
          if (!result.tracks || result.tracks.length === 0) {
            return { success: true, output: "No recommendations found" };
          }
          let output2 = `Recommendations (${result.tracks.length}):

`;
          result.tracks.forEach((track, index) => {
            output2 += `${index + 1}. ${track.name}
`;
            output2 += `   Artist: ${track.artists.map((a) => a.name).join(", ")}
`;
            output2 += `   Album: ${track.album.name}
`;
            output2 += `   ID: ${track.id}
`;
            output2 += `   URI: ${track.uri}

`;
          });
          return { success: true, output: output2 };
        }
        case "new-releases": {
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_D = (_C = settings == null ? void 0 : settings.tools) == null ? void 0 : _C.spotify) == null ? void 0 : _D.clientId) && ((_F = (_E = settings == null ? void 0 : settings.tools) == null ? void 0 : _E.spotify) == null ? void 0 : _F.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const result = await getNewReleases(limit, accessToken2);
          if (!result.success) {
            return result;
          }
          if (!result.albums || result.albums.length === 0) {
            return { success: true, output: "No new releases found" };
          }
          let output2 = `New Releases (${result.albums.length}):

`;
          result.albums.forEach((album, index) => {
            output2 += `${index + 1}. ${album.name}
`;
            output2 += `   Artist: ${album.artists.map((a) => a.name).join(", ")}
`;
            output2 += `   Release Date: ${album.release_date}
`;
            output2 += `   Total Tracks: ${album.total_tracks}
`;
            output2 += `   ID: ${album.id}
`;
            output2 += `   URL: ${album.external_urls.spotify}

`;
          });
          return { success: true, output: output2 };
        }
        case "featured-playlists": {
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_H = (_G = settings == null ? void 0 : settings.tools) == null ? void 0 : _G.spotify) == null ? void 0 : _H.clientId) && ((_J = (_I = settings == null ? void 0 : settings.tools) == null ? void 0 : _I.spotify) == null ? void 0 : _J.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const result = await getFeaturedPlaylists(limit, accessToken2);
          if (!result.success) {
            return result;
          }
          let output2 = "";
          if (result.message) {
            output2 += `${result.message}

`;
          }
          if (!result.playlists || result.playlists.length === 0) {
            return { success: true, output: output2 + "No featured playlists found" };
          }
          output2 += `Featured Playlists (${result.playlists.length}):

`;
          result.playlists.forEach((playlist, index) => {
            output2 += `${index + 1}. ${playlist.name}
`;
            if (playlist.description) {
              output2 += `   Description: ${playlist.description}
`;
            }
            output2 += `   Owner: ${playlist.owner.display_name}
`;
            output2 += `   Tracks: ${playlist.tracks.total}
`;
            output2 += `   ID: ${playlist.id}
`;
            output2 += `   URL: ${playlist.external_urls.spotify}

`;
          });
          return { success: true, output: output2 };
        }
        case "available-genres": {
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_L = (_K = settings == null ? void 0 : settings.tools) == null ? void 0 : _K.spotify) == null ? void 0 : _L.clientId) && ((_N = (_M = settings == null ? void 0 : settings.tools) == null ? void 0 : _M.spotify) == null ? void 0 : _N.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const result = await getAvailableGenres(accessToken2);
          if (!result.success) {
            return result;
          }
          if (!result.genres || result.genres.length === 0) {
            return { success: true, output: "No genres found" };
          }
          let output2 = `Available Genre Seeds for Recommendations (${result.genres.length}):

`;
          const columns = 4;
          const genresPerColumn = Math.ceil(result.genres.length / columns);
          for (let i = 0; i < genresPerColumn; i++) {
            let row = "";
            for (let j = 0; j < columns; j++) {
              const index = i + j * genresPerColumn;
              if (index < result.genres.length) {
                row += result.genres[index].padEnd(20);
              }
            }
            output2 += row.trimEnd() + "\n";
          }
          output2 += "\n\nUse these genres with the recommendations action as seedGenres parameter.";
          return { success: true, output: output2 };
        }
        case "audio-features": {
          if (!trackId) {
            return { success: false, error: "trackId is required for audio-features action" };
          }
          let accessToken2 = userToken;
          if (!accessToken2 && clientId && clientSecret) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            try {
              const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                accessToken2 = tokenData.access_token;
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            try {
              const fs = await import("fs/promises");
              const path = await import("path");
              const os = await import("os");
              const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
              const settingsData = await fs.readFile(settingsPath, "utf-8");
              const settings = JSON.parse(settingsData);
              if (((_P = (_O = settings == null ? void 0 : settings.tools) == null ? void 0 : _O.spotify) == null ? void 0 : _P.clientId) && ((_R = (_Q = settings == null ? void 0 : settings.tools) == null ? void 0 : _Q.spotify) == null ? void 0 : _R.clientSecret)) {
                const credentials = Buffer.from(`${settings.tools.spotify.clientId}:${settings.tools.spotify.clientSecret}`).toString("base64");
                const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: "grant_type=client_credentials"
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken2 = tokenData.access_token;
                }
              }
            } catch (error) {
            }
          }
          if (!accessToken2) {
            return {
              success: false,
              error: "Authentication required. Please provide credentials or run authorize action."
            };
          }
          const result = await getAudioFeatures(trackId, accessToken2);
          if (!result.success) {
            return result;
          }
          if (!result.features) {
            return { success: true, output: "No audio features found" };
          }
          const f = result.features;
          let output2 = `Audio Features for Track ${trackId}:

`;
          output2 += `Acousticness: ${(f.acousticness * 100).toFixed(1)}%
`;
          output2 += `Danceability: ${(f.danceability * 100).toFixed(1)}%
`;
          output2 += `Energy: ${(f.energy * 100).toFixed(1)}%
`;
          output2 += `Instrumentalness: ${(f.instrumentalness * 100).toFixed(1)}%
`;
          output2 += `Liveness: ${(f.liveness * 100).toFixed(1)}%
`;
          output2 += `Speechiness: ${(f.speechiness * 100).toFixed(1)}%
`;
          output2 += `Valence (Happiness): ${(f.valence * 100).toFixed(1)}%
`;
          output2 += `
Loudness: ${f.loudness} dB
`;
          output2 += `Tempo: ${f.tempo} BPM
`;
          output2 += `Key: ${["C", "C\u266F/D\u266D", "D", "D\u266F/E\u266D", "E", "F", "F\u266F/G\u266D", "G", "G\u266F/A\u266D", "A", "A\u266F/B\u266D", "B"][f.key] || "Unknown"}
`;
          output2 += `Mode: ${f.mode === 1 ? "Major" : "Minor"}
`;
          output2 += `Time Signature: ${f.time_signature}/4
`;
          output2 += `Duration: ${Math.floor(f.duration_ms / 6e4)}:${String(Math.floor(f.duration_ms % 6e4 / 1e3)).padStart(2, "0")}
`;
          return { success: true, output: output2 };
        }
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    }
    if (["play", "pause", "next", "previous", "current", "volume-up", "volume-down"].includes(action)) {
      const result = await controlSpotify(action);
      return result;
    }
    if (!query) {
      return {
        success: false,
        error: "Query is required for search action"
      };
    }
    if (!clientId || !clientSecret) {
      (_S = context.logger) == null ? void 0 : _S.debug("No credentials provided as arguments, checking settings file...");
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const os = await import("os");
        const settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
        const settingsData = await fs.readFile(settingsPath, "utf-8");
        const settings = JSON.parse(settingsData);
        const spotifySettings = (_T = settings == null ? void 0 : settings.tools) == null ? void 0 : _T.spotify;
        if (spotifySettings) {
          if (spotifySettings.clientId && !clientId) {
            clientId = spotifySettings.clientId;
            (_U = context.logger) == null ? void 0 : _U.debug("Found clientId from settings file");
          }
          if (spotifySettings.clientSecret && !clientSecret) {
            clientSecret = spotifySettings.clientSecret;
            (_V = context.logger) == null ? void 0 : _V.debug("Found clientSecret from settings file");
          }
        }
      } catch (error) {
        (_W = context.logger) == null ? void 0 : _W.debug("Could not read settings file:", error);
      }
      (_X = context.logger) == null ? void 0 : _X.debug(`Final credentials - clientId: ${clientId ? "present" : "missing"}, clientSecret: ${clientSecret ? "present" : "missing"}`);
    }
    let accessToken = null;
    if (clientId && clientSecret) {
      (_Y = context.logger) == null ? void 0 : _Y.debug("Authenticating with Spotify API");
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      try {
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: "grant_type=client_credentials"
        });
        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error_description || "Authentication failed");
        }
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        (_Z = context.logger) == null ? void 0 : _Z.info("Successfully authenticated with Spotify");
      } catch (error) {
        (__ = context.logger) == null ? void 0 : __.error("Failed to authenticate", error);
        return {
          success: false,
          error: `Failed to authenticate with Spotify API: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    (_$ = context.logger) == null ? void 0 : _$.debug(`Searching for: ${query}`);
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.append("q", String(query));
    searchUrl.searchParams.append("type", "track");
    searchUrl.searchParams.append("limit", Math.min(limit, 50).toString());
    const headers = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    let searchResponse;
    try {
      const response = await fetch(searchUrl.toString(), {
        method: "GET",
        headers
      });
      if (!response.ok) {
        if (response.status === 401 && !accessToken) {
          return {
            success: false,
            error: "Spotify API requires authentication. Please provide clientId and clientSecret arguments.\n\nTo get credentials:\n1. Visit https://developer.spotify.com/dashboard\n2. Create a new app\n3. Copy your Client ID and Client Secret"
          };
        }
        const errorResponse = await response.json();
        throw new Error(((_aa = errorResponse.error) == null ? void 0 : _aa.message) || `HTTP ${response.status}`);
      }
      searchResponse = await response.json();
    } catch (error) {
      (_ba = context.logger) == null ? void 0 : _ba.error("Search failed", error);
      return {
        success: false,
        error: `Failed to search Spotify: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    const tracks = ((_ca = searchResponse.tracks) == null ? void 0 : _ca.items) || [];
    if (tracks.length === 0) {
      return {
        success: false,
        error: `No tracks found for query: "${query}"`
      };
    }
    let output = `Found ${tracks.length} track${tracks.length !== 1 ? "s" : ""}:

`;
    tracks.forEach((track, index) => {
      const artists = track.artists.map((a) => a.name).join(", ");
      output += `${index + 1}. ${track.name}
`;
      output += `   Artist: ${artists}
`;
      output += `   Album: ${track.album.name}
`;
      output += `   ID: ${track.id}
`;
      output += `   URI: ${track.uri}
`;
      if (showUrl) {
        output += `   URL: ${track.external_urls.spotify}
`;
      }
      if (index < tracks.length - 1) {
        output += "\n";
      }
    });
    if (openFirst && tracks.length > 0) {
      const firstTrack = tracks[0];
      const spotifyUri = firstTrack.uri;
      output += `

Opening "${firstTrack.name}" by ${firstTrack.artists[0].name} in Spotify...`;
      try {
        const pauseResult = await controlSpotify("pause");
        if (pauseResult.success) {
          output += "\n\u2713 Paused current playback";
        }
        await openUrl(spotifyUri);
        output += "\n\u2713 Opened in Spotify app";
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const playResult = await controlSpotify("play");
        if (playResult.success) {
          output += "\n\u2713 Started playback";
        }
      } catch (error) {
        try {
          await openUrl(firstTrack.external_urls.spotify);
          output += "\n\u2713 Opened in web browser";
        } catch (webError) {
          output += "\n\u2717 Failed to open Spotify";
        }
      }
    } else if (!openFirst && tracks.length > 0) {
      output += "\n\nTo play a track, copy its URI and paste in Spotify search bar";
      output += "\nor use --openFirst flag to auto-open the first result";
    }
    return {
      success: true,
      output,
      data: {
        trackCount: tracks.length,
        tracks: tracks.map((t) => {
          var _a2;
          return {
            name: t.name,
            artist: (_a2 = t.artists[0]) == null ? void 0 : _a2.name,
            uri: t.uri
          };
        })
      }
    };
  } catch (error) {
    (_da = context.logger) == null ? void 0 : _da.error("Unexpected error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}).examples([
  // Search examples
  {
    description: "Search for a song",
    arguments: {
      action: "search",
      query: "Bohemian Rhapsody Queen"
    }
  },
  {
    description: "Search for albums",
    arguments: {
      action: "search-albums",
      query: "Dark Side of the Moon"
    }
  },
  {
    description: "Search for artists",
    arguments: {
      action: "search-artists",
      query: "Pink Floyd"
    }
  },
  {
    description: "Search for playlists",
    arguments: {
      action: "search-playlists",
      query: "Workout Mix"
    }
  },
  // Playback control
  {
    description: "Pause Spotify playback",
    arguments: {
      action: "pause"
    }
  },
  {
    description: "Resume Spotify playback",
    arguments: {
      action: "play"
    }
  },
  {
    description: "Skip to next track",
    arguments: {
      action: "next"
    }
  },
  {
    description: "Get playback state",
    arguments: {
      action: "playback-state"
    }
  },
  {
    description: "Seek to position (30 seconds)",
    arguments: {
      action: "seek",
      position: 3e4
    }
  },
  {
    description: "Set repeat mode",
    arguments: {
      action: "repeat",
      repeatMode: "track"
    }
  },
  {
    description: "Enable shuffle",
    arguments: {
      action: "shuffle",
      shuffleState: true
    }
  },
  // Queue management
  {
    description: "View current queue",
    arguments: {
      action: "queue"
    }
  },
  {
    description: "Add track to queue",
    arguments: {
      action: "add-to-queue",
      trackUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
    }
  },
  {
    description: "Clear entire queue",
    arguments: {
      action: "clear-queue"
    }
  },
  // Library management
  {
    description: "Like/save a track",
    arguments: {
      action: "like",
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp"
    }
  },
  {
    description: "Unlike/remove a track",
    arguments: {
      action: "unlike",
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp"
    }
  },
  {
    description: "Check if tracks are saved",
    arguments: {
      action: "check-saved",
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp,4cOdK2wGLETKBW3PvgPWqT"
    }
  },
  {
    description: "Get saved tracks",
    arguments: {
      action: "saved-tracks",
      limit: 20
    }
  },
  // Playlist management
  {
    description: "Get user playlists",
    arguments: {
      action: "playlists"
    }
  },
  {
    description: "Get playlist tracks",
    arguments: {
      action: "playlist-tracks",
      playlistId: "your_playlist_id"
    }
  },
  {
    description: "Create a new playlist",
    arguments: {
      action: "create-playlist",
      playlistName: "My Awesome Playlist",
      playlistDescription: "Songs I love"
    }
  },
  {
    description: "Add tracks to playlist",
    arguments: {
      action: "add-to-playlist",
      playlistId: "your_playlist_id",
      trackUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp,spotify:track:4cOdK2wGLETKBW3PvgPWqT"
    }
  },
  {
    description: "Remove tracks from playlist",
    arguments: {
      action: "remove-from-playlist",
      playlistId: "your_playlist_id",
      trackUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
    }
  },
  // User profile
  {
    description: "Get recently played",
    arguments: {
      action: "recently-played",
      limit: 10
    }
  },
  {
    description: "Get top tracks",
    arguments: {
      action: "top-tracks",
      limit: 10,
      timeRange: "short_term"
    }
  },
  {
    description: "Get top artists",
    arguments: {
      action: "top-artists",
      limit: 10,
      timeRange: "medium_term"
    }
  },
  // Device management
  {
    description: "Get available devices",
    arguments: {
      action: "devices"
    }
  },
  {
    description: "Transfer playback to device",
    arguments: {
      action: "transfer",
      deviceId: "your_device_id"
    }
  },
  // Discovery & Recommendations
  {
    description: "Get recommendations based on track",
    arguments: {
      action: "recommendations",
      seedTracks: "3n3Ppam7vgaVa1iaRUc9Lp",
      limit: 10
    }
  },
  {
    description: "Get recommendations based on genre",
    arguments: {
      action: "recommendations",
      seedGenres: "rock,indie",
      limit: 10
    }
  },
  {
    description: "Get new album releases",
    arguments: {
      action: "new-releases",
      limit: 10
    }
  },
  {
    description: "Get featured playlists",
    arguments: {
      action: "featured-playlists",
      limit: 10
    }
  },
  {
    description: "Get available genre seeds",
    arguments: {
      action: "available-genres"
    }
  },
  {
    description: "Get audio features for a track",
    arguments: {
      action: "audio-features",
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp"
    }
  },
  // Authorization
  {
    description: "Authorize Spotify for user actions",
    arguments: {
      action: "authorize"
    }
  }
]).build();
export {
  index_default as default
};
