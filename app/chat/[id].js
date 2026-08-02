
const verifyPin = async () => {
    if (pinInput.length !== 4) {
        Alert.alert('Error', 'El PIN debe tener 4 dígitos');
        return;
    }

    setIsVerifying(true);
    try {
        const { data, error } = await chatService.verifyPin(
            chat.id,
            pinInput,
            currentUser.id
        );

        if (error) throw new Error(error.message || 'Error al verificar PIN');

        if (data.success) {
            setShowPinModal(false);
            await completeTransaction();
        } else {
            let errorMessage = data.error || 'PIN incorrecto';
            if (data.code === 'LOCKED' && data.locked_until) {
                const waitMinutes = Math.ceil((new Date(data.locked_until) - new Date()) / 60000);
                errorMessage = `🔒 Demasiados intentos. Espera ${waitMinutes} minutos.`;
            } else if (data.code === 'WRONG_PIN') {
                const remaining = data.attempts_remaining || 0;
                errorMessage = `❌ PIN incorrecto. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''}.`;
            } else if (data.code === 'CHAT_CLOSED') {
                errorMessage = '⚠️ Este chat ya está cerrado.';
                setShowPinModal(false);
                router.back();
                return;
            }
            Alert.alert('Error', errorMessage);
            setPinInput('');
        }
    } catch (error) {
        console.error('[ChatRoom] verifyPin error:', error);
        Alert.alert('Error', 'No se pudo verificar el PIN. Intenta de nuevo.');
    } finally {
        setIsVerifying(false);
    }
};
