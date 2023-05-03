# bottlejs-extension-pack README

This is the extension "bottlejs-extension-pack" for backend framework in Nano.

## Features

// TODO: Update and explain the logic behind

## Extension Settings

Configs can be set in the global settings.json in the following format:
> // Add the following property:

``` json
{
  "bottlejs-extension-pack.config": {
    "di_layer_list": ["controller", "service", "manager", "dal", "dao"]
  }
}
```
> di_layer_list is the list of items that are DI-Instance

## Known Issues

The extension supports mainly NanoInsure backend developers and uses heuristic on finding the path the dependency-injection. Any other non-usual pattern might not be supported.

> Instances in DAL level with a non-conventional names also cannot be found.

## Release Notes

### 0.0.1
Initial release of bottlejs-extension-pack for Nano Backend Services.

### 0.0.2
Support json extension settings.
