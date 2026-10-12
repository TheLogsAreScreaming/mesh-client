//! Loopback HTTP + WebSocket API for app-wide GATT sessions (Meshtastic / MeshCore).
//! Every route requires the per-process bearer token Electron main hands over on stdin.

mod auth;
mod gatt;
mod status;

use std::sync::Arc;

use axum::extract::DefaultBodyLimit;
use axum::routing::{delete, get, post};
use axum::{Router, middleware};
use http::HeaderValue;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};

use crate::gatt::GattManager;

pub fn router(gatt_manager: Arc<GattManager>, auth_token: String) -> Result<Router, String> {
    let auth = auth::ApiAuth::try_new(auth_token)?;
    Ok(Router::new()
        .route("/api/v1/status", get(status::status))
        .route("/api/v1/gatt/availability", get(gatt::gatt_availability))
        .route("/api/v1/gatt/scan", get(gatt::gatt_scan))
        .route(
            "/api/v1/gatt/release-central",
            post(gatt::gatt_release_central),
        )
        .route(
            "/api/v1/gatt/clear-bond-recovery",
            post(gatt::gatt_clear_bond_recovery),
        )
        .route("/api/v1/gatt/pair-state", get(gatt::gatt_pair_state))
        .route("/api/v1/gatt/pair", post(gatt::gatt_pair))
        .route("/api/v1/gatt/unpair", post(gatt::gatt_unpair))
        .route("/api/v1/gatt/sessions", post(gatt::gatt_create_session))
        .route(
            "/api/v1/gatt/sessions/{session_id}",
            delete(gatt::gatt_delete_session),
        )
        .route(
            "/api/v1/gatt/sessions/{session_id}/write",
            post(gatt::gatt_write),
        )
        .route(
            "/api/v1/gatt/sessions/{session_id}/rssi",
            get(gatt::gatt_rssi),
        )
        .route(
            "/api/v1/gatt/sessions/{session_id}/connected",
            get(gatt::gatt_is_connected),
        )
        .route(
            "/api/v1/gatt/sessions/{session_id}/events",
            get(gatt::gatt_session_ws),
        )
        .route(
            "/api/v1/gatt/registry/register",
            post(gatt::gatt_register_external),
        )
        .route(
            "/api/v1/gatt/registry/unregister",
            post(gatt::gatt_unregister_external),
        )
        .layer(DefaultBodyLimit::max(4 * 1024 * 1024))
        .layer(localhost_cors_layer())
        .with_state(gatt_manager)
        // Last layer is outermost: every HTTP route and WebSocket upgrade authenticates first.
        .layer(middleware::from_fn_with_state(
            auth,
            auth::require_bearer_auth,
        )))
}

fn localhost_cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(
            |origin: &HeaderValue, _request_parts| is_localhost_origin(origin),
        ))
        .allow_methods(Any)
        .allow_headers(Any)
}

fn is_localhost_origin(origin: &HeaderValue) -> bool {
    let Ok(origin) = origin.to_str() else {
        return false;
    };
    let origin = origin.trim_end_matches('/');
    origin == "http://localhost"
        || origin == "https://localhost"
        || origin.starts_with("http://localhost:")
        || origin.starts_with("https://localhost:")
        || origin == "http://127.0.0.1"
        || origin == "https://127.0.0.1"
        || origin.starts_with("http://127.0.0.1:")
        || origin.starts_with("https://127.0.0.1:")
}
