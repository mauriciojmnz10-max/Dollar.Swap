
import { Image } from 'expo-image';
// ...
<Image
    source={{ uri: bills_photo_url }}
    style={styles.image}
    placeholder={blurhash}
    contentFit="cover"
    transition={200}
    cachePolicy="memory-disk"
/>
