# Localized	11/10/2014 06:32 PM (GMT)	303:4.80.0411 	en-US-Add_AppxPackage.psd1
# Culture = "en-US"
ConvertFrom-StringData @'
###PSLOC
PromptText=[Y] Ja [N] Nein (Standardeinstellung ist "N")
    PromptYesCharacter = Y
    PromptNoCharacter = N
PromptYesString=Ja
PromptNoString=Nein
CreatingPackage=Anwendungspaket wird erstellt...
SigningPackage=Signiervorgang für Anwendungspaket läuft...
PackageFound=Paket gefunden: {0}
InstalledPackageFound=Installation des Pakets gefunden: {0}
RemovingInstalledPackage=Bereits installierte Version des Pakets wird entfernt: {0}
CertificateFound=Zertifikat gefunden: {0}
DependenciesFound=Abhängigkeitspakete gefunden:
GettingDeveloperLicense=Entwicklerlizenz wird abgerufen...
InstallingCertificate=Zertifikat wird installiert...
InstallingPackage=\nPaket wird installiert...
AcquireLicenseSuccessful=Entwicklerlizenz wurde erfolgreich abgerufen.
InstallCertificateSuccessful=Das Zertifikat wurde erfolgreich installiert.
Success=\nErfolg: Das Paket wurde erfolgreich installiert.
WarningInstallCert=Sie installieren in Kürze ein digitales Zertifikat für den Zertifikatspeicher für vertrauenswürdige Personen auf Ihrem Computer. Diese Aktion stellt ein ernstzunehmendes Risiko dar und sollte nur ausgeführt werden, wenn Sie dem Aussteller dieses digitalen Zertifikats vertrauen. 

Sie sollten das zugeordnete digitale Zertifikat manuell deinstallieren, wenn Sie mit der Verwendung dieser App fertig sind. Anweisungen zu diesem Vorgang finden Sie unter:\nhttp://go.microsoft.com/fwlink/?LinkId=243053
WarningPromptContinue=\nMöchten Sie den Vorgang wirklich fortsetzen?
ElevateActions=\nFühren Sie vor dem Installieren dieses Pakets die folgenden Schritte aus:
ElevateActionDevLicense=\t- Erwerben Sie eine Entwicklerlizenz
ElevateActionCertificate=\t- Installieren Sie das Signaturzertifikat
ElevateActionsContinue=Zum Fortfahren sind Administratoranmeldeinformationen erforderlich. Akzeptieren Sie die Aufforderung der Benutzerkontensteuerung (UAC), und geben Sie Ihr Administratorkennwort ein, wenn Sie dazu aufgefordert werden.
ErrorForceElevate=Sie müssen Administratoranmeldeinformationen eingeben, um fortzufahren. Führen Sie dieses Skript ohne den "-Force"-Parameter oder von einem PowerShell-Fenster mit erhöhten Rechten aus.
ErrorLaunchAdminFailed=Fehler: Es konnte kein neuer Prozess als Administrator gestartet werden.
ErrorNoScriptPath=Fehler: Sie müssen dieses Skript aus einer Datei heraus starten.
ErrorNoPackageFound=Fehler: Im Skriptverzeichnis wurde kein Paket gefunden. Stellen Sie sicher, dass sich das Paket, das Sie installieren möchten, im selben Verzeichnis befindet, wie dieses Skript.
ErrorManyPackagesFound=Fehler: Im Skriptverzeichnis wurde mehr als ein Paket gefunden. Stellen Sie sicher, dass sich nur das Paket, das Sie installieren möchten, im selben Verzeichnis befindet, wie dieses Skript.
ErrorPackageUnsigned=Fehler: Das Paket ist nicht digital signiert oder die Signatur ist beschädigt.
ErrorNoCertificateFound=Fehler: Im Skriptverzeichnis wurde kein Zertifikat gefunden. Stellen Sie sicher, dass sich das Zertifikat, das zum Signieren des zu installierenden Pakets verwendet wurde, im selben Verzeichnis befindet, wie dieses Skript.
ErrorManyCertificatesFound=Fehler: Im Skriptverzeichnis wurde mehr als ein Zertifikat gefunden. Stellen Sie sicher, dass sich nur das Zertifikat, das zum Signieren des zu installierenden Pakets verwendet wurde, im selben Verzeichnis befindet, wie dieses Skript.
ErrorBadCertificate=Fehler: Die Datei "{0}" ist kein gültiges digitales Zertifikat. CertUtil wurde mit dem Fehlercode {1} zurückgegeben.
ErrorExpiredCertificate=Fehler: Das Entwicklerzertifikat "{0}" ist abgelaufen. Möglicherweise ist die Systemuhr nicht auf das richtige Datum und die richtige Uhrzeit eingestellt. Wenn die Systemeinstellungen richtig sind, wenden Sie sich an den Paketinhaber, um ein Paket mit einem gültigen Zertifikat neu zu erstellen.
ErrorCertificateMismatch=Fehler: Das Zertifikat stimmt nicht mit dem Zertifikat überein, das zum Signieren des Pakets verwendet wurde.
ErrorCertIsCA=Fehler: Das Zertifikat darf keine Zertifizierungsstelle sein.
ErrorBannedKeyUsage=Fehler: Das Zertifikat darf nicht über die folgende Schlüsselverwendung verfügen: {0}. Die Schlüsselverwendung darf nicht angegeben sein oder muss "DigitalSignature" entsprechen.
ErrorBannedEKU=Fehler: Das Zertifikat darf nicht die folgende erweiterte Schlüsselverwendung besitzen: {0}. Es sind nur die EKUs "Codesignatur" und "Lebensdauersignatur" zulässig.
ErrorNoBasicConstraints=Fehler: Die Basiseinschränkungserweiterung des Zertifikats fehlt.
ErrorNoCodeSigningEku=Fehler: Die erweiterte Schlüsselverwendung des Zertifikats zur Codesignierung fehlt.
ErrorInstallCertificateCancelled=Fehler: Die Installation des Zertifikats wurde abgebrochen.
ErrorCertUtilInstallFailed=Fehler: Das Zertifikat konnte nicht installiert werden. CertUtil wurde mit dem Fehlercode "{0}" zurückgegeben.
ErrorGetDeveloperLicenseFailed=Fehler: Es konnte keine Entwicklerlizenz erworben werden. Weitere Informationen finden Sie unter http://go.microsoft.com/fwlink/?LinkID=252740.
ErrorInstallCertificateFailed=Fehler: Das Zertifikat konnte nicht installiert werden. Status: {0}. Weitere Informationen finden Sie unter http://go.microsoft.com/fwlink/?LinkID=252740.
ErrorAddPackageFailed=Fehler: Das Paket konnte nicht installiert werden.
ErrorAddPackageFailedWithCert=Fehler: Das Paket konnte nicht installiert werden. Zur Wahrung der Sicherheit sollten Sie die Deinstallation des Signaturzertifikats in Betracht ziehen, bis Sie das Paket installieren können. Anweisungen zu diesem Vorgang finden Sie unter:
http://go.microsoft.com/fwlink/?LinkId=243053
MakeAppxFailed=Fehler: Die AppX konnte für die veröffentlichte Anwendung nicht erstellt werden.
ErrorUnsupportedOperatingSystem=Fehler: Diese App kann auf diesem PC nicht ausgeführt werden.
###PSLOC
'@
