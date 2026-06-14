import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useGroupSmartReplies, useChatSmartReplies } from '@/hooks/useAi';

interface SmartReplyProps {
  groupId: string;
  isGroup?: boolean;
  onSend: (text: string) => void;
}

const SmartReply = ({ groupId, isGroup = true, onSend }: SmartReplyProps) => {
  const groupReplies = useGroupSmartReplies(isGroup ? groupId : '');
  const chatReplies = useChatSmartReplies(!isGroup ? groupId : '');

  const { data, isLoading } = isGroup ? groupReplies : chatReplies;

  if (isLoading || !data?.suggestions || data.suggestions.length === 0) return null;

  return (
    <View style={styles.outerContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {data.suggestions.map((suggestion, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.pill} 
            onPress={() => onSend(suggestion)}
          >
            <Text style={styles.text}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  container: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 13,
    color: '#0068FF',
    fontFamily: 'Jakarta-Medium',
  },
});

export default SmartReply;
