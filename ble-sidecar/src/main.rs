//! Bluetooth LE helper for Mesh Hub.
//!
//! Hosts Meshtastic / MeshCore GATT sessions (btleplug) behind a loopback HTTP + WebSocket
//! API that the Electron main process drives (`src/main/gatt-sidecar-proxy.ts`).

mod api;
mod gatt;

use std::net::{IpAddr, SocketAddr};
use std::process::ExitCode;

use clap::Parser;
use tokio::io::{AsyncBufReadExt, BufReader};
use tracing::{error, info};

#[derive(Parser, Debug)]
#[command(name = "mesh-hub-ble")]
struct Cli {
    #[arg(long, default_value = "127.0.0.1")]
    host: String,
    #[arg(long, default_value_t = 19437)]
    port: u16,
    /// Accepted for launcher compatibility; the helper always runs headless.
    #[arg(long)]
    headless: bool,
    /// Accepted for launcher compatibility; reserved for future on-disk state.
    #[arg(long)]
    storage_dir: Option<String>,
}

/// Parse an explicit loopback IP (IPv4 or IPv6, optionally bracketed); hostnames are refused.
fn loopback_socket_addr(host: &str, port: u16) -> Result<SocketAddr, String> {
    let bare_host = host
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(host);
    let ip = bare_host
        .parse::<IpAddr>()
        .map_err(|_| "helper host must be an explicit loopback IP address".to_string())?;
    if !ip.is_loopback() {
        return Err("helper refuses non-loopback listen addresses".to_string());
    }
    Ok(SocketAddr::new(ip, port))
}

/// Read the per-process bearer token Electron main writes to our stdin (never argv/env).
async fn read_auth_token_from_stdin() -> Result<String, String> {
    let mut line = String::new();
    let mut reader = BufReader::new(tokio::io::stdin());
    let bytes = reader
        .read_line(&mut line)
        .await
        .map_err(|e| format!("failed to read helper authentication bootstrap: {e}"))?;
    if bytes == 0 {
        return Err("missing helper authentication bootstrap".to_string());
    }
    if line.ends_with('\n') {
        line.pop();
        if line.ends_with('\r') {
            line.pop();
        }
    }
    if line.is_empty() || line.contains(['\r', '\n']) {
        return Err("invalid helper authentication bootstrap".to_string());
    }
    Ok(line)
}

#[tokio::main]
async fn main() -> ExitCode {
    // stdout/stderr are pipes to Electron main, which parses the level/target tokens; ANSI
    // codes break that parse (tracing-subscriber does not detect non-TTY writers).
    tracing_subscriber::fmt()
        .with_ansi(false)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let cli = Cli::parse();

    let addr = match loopback_socket_addr(&cli.host, cli.port) {
        Ok(addr) => addr,
        Err(e) => {
            error!(host = %cli.host, port = cli.port, error = %e, "invalid listen address");
            return ExitCode::from(1);
        }
    };

    let auth_token = match read_auth_token_from_stdin().await {
        Ok(token) => token,
        Err(e) => {
            error!(error = %e, "helper authentication bootstrap failed");
            return ExitCode::from(1);
        }
    };

    let gatt = gatt::create_gatt_manager().await;
    let app = match api::router(gatt, auth_token) {
        Ok(app) => app,
        Err(e) => {
            error!(error = %e, "helper authentication bootstrap rejected");
            return ExitCode::from(1);
        }
    };

    info!(%addr, headless = cli.headless, "listening");
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(e) => {
            error!(%addr, error = %e, "failed to bind listen address");
            return ExitCode::from(1);
        }
    };
    if let Err(e) = axum::serve(listener, app).await {
        error!(error = %e, "HTTP server exited with error");
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn listen_address_is_strictly_loopback() {
        assert_eq!(
            loopback_socket_addr("127.0.0.1", 19437).unwrap(),
            "127.0.0.1:19437".parse().unwrap()
        );
        assert_eq!(
            loopback_socket_addr("::1", 19437).unwrap(),
            "[::1]:19437".parse().unwrap()
        );
        assert!(loopback_socket_addr("0.0.0.0", 19437).is_err());
        assert!(loopback_socket_addr("192.168.1.10", 19437).is_err());
        assert!(loopback_socket_addr("localhost", 19437).is_err());
    }

    #[test]
    fn parses_launcher_arguments() {
        let cli = Cli::parse_from([
            "mesh-hub-ble",
            "--headless",
            "--host",
            "127.0.0.1",
            "--port",
            "4100",
            "--storage-dir",
            "/tmp/x",
        ]);
        assert!(cli.headless);
        assert_eq!(cli.port, 4100);
        assert_eq!(cli.storage_dir.as_deref(), Some("/tmp/x"));
    }
}
