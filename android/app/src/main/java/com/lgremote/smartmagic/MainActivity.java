package com.lgremote.smartmagic;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LgBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
