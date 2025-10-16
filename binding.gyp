{
  "targets": [
    {
      "target_name": "bridge",
      "sources": [
        "lib/bridge/main.cpp"
      ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/node_modules/node-addon-api",
        "<(node_root_dir)/include/node"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc!": [
        "-fno-exceptions"
      ]
    }
  ]
}