package com.gdesapsom.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Draw under the status and navigation bars on every Android version, as
        // Android 15+ already enforces for apps targeting API 35+. Capacitor's
        // SystemBars plugin hands the bar sizes to the page (--safe-area-inset-*),
        // and the web app pads its bars and sheets with them. Capacitor 9 does
        // this by default.
        EdgeToEdge.enable(this);
    }
}
