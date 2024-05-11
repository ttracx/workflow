use eyre::Result;


use tauri_plugin_shell::{ShellExt, process::CommandEvent};
use tauri::{path::BaseDirectory};
use std::path::PathBuf;
use std::{str::FromStr};
use tauri::{ Manager};




#[tauri::command]
pub async fn start_edge_runtime(app_handle: tauri::AppHandle, webview_window: tauri::WebviewWindow ) -> Result<String, ()> { 
    let resource_path = app_handle
        .path()
        .resolve("functions", BaseDirectory::Resource)
        .expect("failed to resolve resource");


    let main_service = resource_path.join("main");
    let event_worker = resource_path.join("event");
    let env = [("SERVICE_BASE_DIR", resource_path.to_string_lossy().to_string())];

    println!("Starting edge runtime with main service: {}", main_service.to_string_lossy());

    let sidecar_command = app_handle.shell().sidecar("edge-runtime").unwrap()
        .args(["start", "--main-service", &main_service.to_string_lossy(), "--event-worker", &event_worker.to_string_lossy()])
        .envs(env);
    let (mut rx,  _child) = sidecar_command
        .spawn()
        .expect("Failed to spawn sidecar");

    // let window = app.get_webview_window("main").unwrap();
    // window.open_devtools();
    let window: tauri::Window = webview_window.as_ref().window();
    

    tauri::async_runtime::spawn(async move {
    // read events such as stdout
        while let Some(event) = rx.recv().await {
          match event {
            CommandEvent::Stdout(line) => {
              let line_str = String::from_utf8_lossy(&line); // Convert Vec<u8> to String
              let formatted_line = format!("'{:#?}'", line_str);
              window
                  .emit("message", Some(formatted_line.clone()))
                  .expect("failed to emit event");
              
              println!("stdout: {}", formatted_line); // Log the formatted line
            },
            CommandEvent::Stderr(line) => {
              let line_str = String::from_utf8_lossy(&line); // Convert Vec<u8> to String
              let formatted_line = format!("{:#?}", line_str);
              
              window
                  .emit("message", Some(formatted_line.clone()))
                  .expect("failed to emit event");
              
              println!("stderr: {}", formatted_line); // Log the formatted line
            },
            CommandEvent::Terminated(payload) =>  {
              // let line_str = String::from_utf8_lossy(&payload); // Convert Vec<u8> to String
              let formatted_line = format!("'{:#?}'", payload);
              
              window
                  .emit("message", Some(format!("Terminated: {:#?}", payload)))
                  .expect("failed to emit event");
              
              println!("{:?}", formatted_line); // Log the formatted line
            },
            _ =>  println!("{:?}", event)
          };
        }
    });

    Ok(format!("OK"))

}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn open_main_window(app_handle: &tauri::AppHandle) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        crate::dock::set_dock_visible(true);
    }

    if let Some(window) = app_handle.get_webview_window("main") {
        window.show().unwrap();
        window.set_focus().unwrap();
    } else {
        let url = tauri::WebviewUrl::App(PathBuf::from_str("/index.html").unwrap());
        tauri::WebviewWindowBuilder::new(app_handle, "main", url)
            .title("RustDuck")
            .inner_size(800.0, 600.0)
            .visible(false)
            .build()
            .unwrap();
    }

    Ok(())
}
