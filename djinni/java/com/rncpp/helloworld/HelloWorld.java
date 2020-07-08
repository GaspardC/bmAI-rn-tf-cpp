// AUTOGENERATED FILE - DO NOT MODIFY!
// This file generated by Djinni from helloworld.djinni

package com.rncpp.helloworld;

import java.util.concurrent.atomic.AtomicBoolean;

public abstract class HelloWorld {
    public abstract String analyzeImage(String photoUri, boolean isIos);

    public static HelloWorld create()
    {
        return CppProxy.create();
    }

    private static final class CppProxy extends HelloWorld
    {
        private final long nativeRef;
        private final AtomicBoolean destroyed = new AtomicBoolean(false);

        private CppProxy(long nativeRef)
        {
            if (nativeRef == 0) throw new RuntimeException("nativeRef is zero");
            this.nativeRef = nativeRef;
        }

        private native void nativeDestroy(long nativeRef);
        public void _djinni_private_destroy()
        {
            boolean destroyed = this.destroyed.getAndSet(true);
            if (!destroyed) nativeDestroy(this.nativeRef);
        }
        protected void finalize() throws java.lang.Throwable
        {
            _djinni_private_destroy();
            super.finalize();
        }

        @Override
        public String analyzeImage(String photoUri, boolean isIos)
        {
            assert !this.destroyed.get() : "trying to use a destroyed object";
            return native_analyzeImage(this.nativeRef, photoUri, isIos);
        }
        private native String native_analyzeImage(long _nativeRef, String photoUri, boolean isIos);

        public static native HelloWorld create();
    }
}
