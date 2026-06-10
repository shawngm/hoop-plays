# Hoop Plays

A mobile-first basketball playbook web app for GitHub Pages.

## What it does

- Shows a half-court basketball diagram
- Lets you drag 5 players into starting positions
- Lets you assign the ball to a player
- Lets you add cuts, passes, and screens
- Saves plays in the browser using localStorage
- Replays the play sequence with basic animation
- Includes a simple Player POV notes panel
- Works well when saved to an iPhone Home Screen

## How to publish on GitHub Pages

1. Open this repository on GitHub.
2. Go to **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Click **Save**.

The app should publish at:

`https://shawngm.github.io/hoop-plays/`

## iPhone install

1. Open the GitHub Pages app URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Name it **Hoop Plays**.
5. Open it from the Home Screen.

## Basic use

- **Move**: drag players into starting spots.
- **Set Ball**: tap which player starts with the ball.
- **Add Cut**: tap the player, then tap the destination.
- **Add Pass**: tap passer, then receiver.
- **Screen**: tap screener, then tap the screen location.
- **Save**: enter a play name and save it.
- **Replay**: animates the saved movement sequence.

## Notes

This is intentionally built with plain HTML, CSS, and JavaScript so it can run directly from GitHub Pages without a build step.
