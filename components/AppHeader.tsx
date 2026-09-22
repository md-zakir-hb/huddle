import { StyleSheet, View } from 'react-native';

export default function AppHeader() {
  return <View style={styles.card}></View>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 60,
    padding: 16,
    backgroundColor: '#FDF4D2',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
