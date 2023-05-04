# nano-backend-language-support README

This is the extension "nano-backend-language-support" for backend framework in Nano.

## Features
1. Type Definition for bottlejs (Jump to definition)
2. Auto Completion for bottlejs 
3. Snippets for Nano Backend

## Snippets
1. `snippet-init-router` - Create a new router instance
2. `snippet-init-controller` - Create a new controller instance
3. `snippet-init-unit-test` - Create a new unit test
4. `snippet-auditLogService-failed` - Create a new failed auditLogService
5. `snippet-auditLogService-success` - Create a new success auditLogService
6. `snippet-controller-func` - Create a new controller function

## Note when using the extension
1. The extension will only work if the file is in the same folder as the bottlejs instance.

// TODO: Update and explain the logic behind

## Extension Settings

Configs can be set in the global settings.json in the following format:
> // Add the following property:

``` json
{
  "nano-backend-language-support.config": {
    "di_layer_list": ["controller", "service", "manager", "dal", "dao"]
  }
}
```
> di_layer_list is the list of items that are DI-Instance

## Known Issues

The extension supports mainly NanoInsure backend developers and uses heuristic on finding the path the dependency-injection. Any other non-usual pattern might not be supported.
> Instances in DAL level with a non-conventional names also cannot be found.

## Workaround

When using this extension, you must provide a period (.) to trigger the auto-completion. Additionally, the auto-completion suggestions will be placed at the end of the suggestion list. To resolve this issue, you can turn off the editor.suggest.showWords flag in your global or workspace settings.json file.

Here is an example of how to turn off the editor.suggest.showWords flag:

```json
{
    ...
    "editor.suggest.showWords": false,
    ...
}
```
By turning off this flag, auto-completion suggestions will appear at the top of the suggestion list, making them easier to access.


## Latest Release Notes

### 1.0.0
Added Snippets for Nano Backend Developers