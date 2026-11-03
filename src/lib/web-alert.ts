import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * En web, Alert.alert de React Native no hace nada: los avisos no aparecían y
 * los botones de confirmación nunca corrían. Esto lo reemplaza por los
 * diálogos del navegador. Con un botón de cancelar usa confirm(); si no, alert().
 */
export function instalarAlertWeb() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const texto = [title, message].filter(Boolean).join('\n\n');
    const lista = buttons && buttons.length ? buttons : [{ text: 'OK' }];
    if (lista.length === 1) {
      window.alert(texto);
      lista[0].onPress?.();
      return;
    }
    const cancelar = lista.find((b) => b.style === 'cancel');
    const accion = [...lista].reverse().find((b) => b !== cancelar) ?? lista[lista.length - 1];
    if (window.confirm(texto)) accion.onPress?.();
    else cancelar?.onPress?.();
  };
}
