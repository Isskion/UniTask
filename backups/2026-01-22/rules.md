# Working Rules - UniTask

1. **No Emulator usage**: We only work in the **local environment** and push changes to **Git**.
2. **Production Safety**: NEVER touch production data unless explicitly requested by the user.
3. **No Massive Updates**: Avoid any massive updates in production; production data is actively in use.
4. **Daily Backups**: Perform a database backup whenever these rules are read (daily start), saving it in a local folder with a clear date (e.g., `backups/YYYY-MM-DD/`) to allow for recovery if needed.
