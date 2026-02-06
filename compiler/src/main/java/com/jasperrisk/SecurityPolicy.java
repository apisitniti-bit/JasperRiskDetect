package com.jasperrisk;

import java.io.FilePermission;
import java.net.SocketPermission;
import java.security.Permission;

/**
 * Custom SecurityManager for the compile sandbox.
 * Denies: network access, file write outside /tmp, process exec, classloader creation (partially).
 * Java 6 compatible — NO Java 8+ syntax.
 */
public class SecurityPolicy extends SecurityManager {

    private static final String TMP_DIR_UNIX = "/tmp";
    private static final String TMP_DIR_WIN = System.getProperty("java.io.tmpdir", "");

    public void checkPermission(Permission perm) {
        // Allow read permissions broadly (needed for classpath JARs, JRXML files)
        if (perm instanceof FilePermission) {
            String actions = perm.getActions();
            if (actions != null && (actions.contains("write") || actions.contains("delete"))) {
                String name = perm.getName();
                // Allow write/delete only under /tmp or system temp dir
                if (!isUnderTmpDir(name)) {
                    throw new SecurityException(
                        "File write/delete denied outside temp directory: " + name
                    );
                }
            }
            // read and execute are allowed
            return;
        }

        // Deny all socket/network operations
        if (perm instanceof SocketPermission) {
            throw new SecurityException("Network access denied in compile sandbox");
        }

        // Deny specific runtime permissions
        if (perm instanceof RuntimePermission) {
            String name = perm.getName();
            // Deny exec (process creation)
            if ("createProcess".equals(name)) {
                throw new SecurityException("Process creation denied in compile sandbox");
            }
            // Allow setSecurityManager so the sandbox can be installed
            if ("setSecurityManager".equals(name)) {
                return;
            }
            // Allow createClassLoader — JasperReports compiler needs this
            if ("createClassLoader".equals(name)) {
                return;
            }
            // Allow getenv, accessDeclaredMembers, etc.
            return;
        }

        // Allow other permissions (PropertyPermission, ReflectPermission, etc.)
    }

    public void checkPermission(Permission perm, Object context) {
        checkPermission(perm);
    }

    // Deny connect/listen/accept/resolve
    public void checkConnect(String host, int port) {
        throw new SecurityException("Network connect denied in compile sandbox: " + host + ":" + port);
    }

    public void checkConnect(String host, int port, Object context) {
        throw new SecurityException("Network connect denied in compile sandbox: " + host + ":" + port);
    }

    public void checkListen(int port) {
        throw new SecurityException("Network listen denied in compile sandbox");
    }

    public void checkAccept(String host, int port) {
        throw new SecurityException("Network accept denied in compile sandbox");
    }

    // Deny exec
    public void checkExec(String cmd) {
        throw new SecurityException("Process exec denied in compile sandbox: " + cmd);
    }

    private boolean isUnderTmpDir(String path) {
        if (path == null) return false;
        String normalized = path.replace('\\', '/');
        if (normalized.startsWith(TMP_DIR_UNIX)) return true;
        if (TMP_DIR_WIN.length() > 0) {
            String normalizedTmp = TMP_DIR_WIN.replace('\\', '/');
            if (normalized.startsWith(normalizedTmp)) return true;
        }
        return false;
    }
}
