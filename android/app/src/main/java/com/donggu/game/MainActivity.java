package com.donggu.game;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** A fullscreen, completely offline Android shell for the Donggu card game. */
public class MainActivity extends Activity {
    private WebView gameView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

        gameView = new WebView(this);
        gameView.setBackgroundColor(Color.rgb(6, 42, 36));
        gameView.getSettings().setJavaScriptEnabled(true);
        gameView.getSettings().setDomStorageEnabled(true);
        gameView.getSettings().setAllowFileAccess(true);
        gameView.getSettings().setDefaultTextEncodingName("UTF-8");
        gameView.setWebChromeClient(new WebChromeClient());
        gameView.setWebViewClient(new WebViewClient());
        setContentView(gameView);
        gameView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onDestroy() {
        if (gameView != null) {
            gameView.destroy();
            gameView = null;
        }
        super.onDestroy();
    }
}

