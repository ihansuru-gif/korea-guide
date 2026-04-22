# MD Pocket Reader

A tiny mobile-friendly web app for reading and editing `.md`, `.markdown`, and `.txt` files.

## Use

1. Open the site in your phone browser.
2. Tap `Open file` and choose a Markdown or TXT file.
3. Use `Read`, `Edit`, or `Split` mode.
4. Tap `Save` to download the edited copy.

## Notes

- Files are not uploaded to a server.
- Mobile browsers often block direct overwrite access to the original file.
- In that case, `Save` downloads a new edited copy.
- Some desktop Chrome environments can save back to the original file.

## Local test

```powershell
cd "C:\Users\USER\Documents\New project\mobile-md-reader"
python -m http.server 8787
```

Open `http://127.0.0.1:8787` in your browser.
