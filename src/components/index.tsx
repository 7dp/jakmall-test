import FeatherIcon from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CategoriesResponse, Joke, JokesResponse } from "../types";

type Data = {
  category: string;
  data: Joke[];
};
type CategoryLoadMoreCount = Record<string, number>;

function JokesList() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categoryLoadMoreCount, setCategoryLoadMoreCount] =
    useState<CategoryLoadMoreCount>({});
  const [tappedCategories, setTappedCategories] = useState<string[]>([]);
  const lastTappedCategory = tappedCategories.at(-1);
  const [data, setData] = useState<Data[]>([]);

  const {
    data: categoriesRawData,
    isRefetching: isRefetchingCategories,
    isPending: isPendingCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("https://v2.jokeapi.dev/categories");
      const json = await response.json();
      return json as CategoriesResponse;
    },
  });

  const { data: jokesRawData } = useQuery({
    queryKey: ["jokes", tappedCategories],
    queryFn: async () => {
      const url = `https://v2.jokeapi.dev/joke/${lastTappedCategory}?type=single&amount=2`;
      const response = await fetch(url);
      const json = (await response.json()) as JokesResponse;
      if (json.error) {
        showAlert(`${json.message} for category ${lastTappedCategory}`);
      }
      return json;
    },
    enabled: !!lastTappedCategory,
    gcTime: 0,
  });

  useEffect(() => {
    if (!categoriesRawData) return;

    // populate data for the list
    setData(
      categoriesRawData.categories.map((category) => ({
        category,
        data: [],
      }))
    );
  }, [categoriesRawData]);

  useEffect(() => {
    if (!jokesRawData || !lastTappedCategory) return;

    // append jokes to relevant category
    const jokes = jokesRawData.jokes ?? [];
    setData((prev) => {
      return prev.map((d) => {
        return d.category === lastTappedCategory
          ? { ...d, data: [...d.data, ...jokes] }
          : d;
      });
    });
  }, [jokesRawData]);

  async function handleRefresh() {
    try {
      // reset states before refetching categories
      setData([]);
      setExpandedCategories([]);
      setCategoryLoadMoreCount({});
      setTappedCategories([]);

      await refetchCategories();
    } catch (error) {
      console.log("handleRefresh error:", error);
    }
  }

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => {
      return prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];
    });
    if (!tappedCategories.includes(category)) {
      setTappedCategories((prev) => [...prev, category]);
    }

    // when re-expanded refetch the category that has empty jokes
    const target = data.find((d) => d.category === category);
    const shouldRefetchEmptySection =
      !target?.data.length && !expandedCategories.includes(category);
    if (shouldRefetchEmptySection) {
      setTappedCategories((prev) => [...prev, category]);
    }
  }

  function goToTop(category: string) {
    setData((prev) => {
      const categoryIndex = prev.findIndex((d) => d.category === category);
      if (categoryIndex <= 0) {
        return prev;
      }
      const newData = [...prev];
      const [selectedCategory] = newData.splice(categoryIndex, 1);
      newData.unshift(selectedCategory);
      return newData;
    });
  }

  function showAlert(message: string) {
    Alert.alert("Info", message, undefined, { cancelable: true });
  }

  function loadMore(category: string) {
    // track each category load-more "quota", max 2
    setCategoryLoadMoreCount((prev) => {
      const value = { ...prev };
      value[category] = (prev[category] || 0) + 1;
      return value;
    });
    setTappedCategories((prev) => [...prev, category]);
  }

  function renderSectionHeader(info: { section: SectionListData<Joke, Data> }) {
    const { category } = info.section;
    const sectionIndex = data.findIndex((d) => d.category === category);
    const isExpanded = expandedCategories.includes(category);

    return (
      <Animated.View
        entering={FadeIn.delay(sectionIndex * 45)}
        exiting={FadeOut.delay((data.length - sectionIndex) * 40)}
      >
        <TouchableOpacity
          onPress={() => toggleCategory(category)}
          style={styles.sectionHeader}
        >
          <View style={styles.numberTextContainer}>
            <Text style={styles.numberText}>{sectionIndex + 1}</Text>
          </View>
          <Text style={styles.categoryText}>{category}</Text>
          <TouchableOpacity
            disabled={sectionIndex === 0}
            onPress={() => goToTop(category)}
            style={[
              styles.goTopButton,
              sectionIndex === 0 && styles.alreadyTopButton,
            ]}
          >
            <Text style={styles.goTopText}>
              {sectionIndex === 0 ? "Top" : "Go to Top"}
            </Text>
          </TouchableOpacity>
          <FeatherIcon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={"gray"}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderItem({
    item,
    section,
    index,
  }: SectionListRenderItemInfo<Joke, Data>) {
    if (!expandedCategories.includes(section.category)) {
      return null;
    }
    return (
      <Animated.View entering={FadeIn.delay(index * 50)}>
        <TouchableOpacity
          onPress={() => showAlert(item.joke)}
          style={[styles.sectionItem, index === 0 && { marginTop: 16 }]}
        >
          <View style={styles.decoratorView} />
          <View style={styles.containerTextSectionItem}>
            <Text style={styles.textSectionItem}>{item.joke}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderSectionFooter(info: { section: SectionListData<Joke, Data> }) {
    const { category, data: sectionData } = info.section;
    const shouldShowLoadMoreButton =
      (categoryLoadMoreCount[category] || 0) <= 1 &&
      expandedCategories.includes(category) &&
      sectionData.length !== 0;

    if (!shouldShowLoadMoreButton) {
      return null;
    }

    return (
      <Animated.View entering={FadeIn.delay(175)}>
        <TouchableOpacity
          onPress={() => loadMore(category)}
          style={styles.loadMoreButton}
        >
          <Text style={styles.loadMoreText}>Load more</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.textTitle}>Jokes Library</Text>
      {isPendingCategories ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.flex}>
          <ActivityIndicator size={56} color="dodgerblue" />
        </Animated.View>
      ) : (
        <SectionList
          sections={data}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContentContainer}
          refreshing={isRefetchingCategories}
          renderSectionFooter={renderSectionFooter}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    justifyContent: "center",
    flex: 1,
  },
  decoratorView: {
    width: 6,
    backgroundColor: "rgba(30, 144, 255, 0.2)",
  },
  textTitle: {
    fontWeight: "bold",
    fontSize: 22,
  },
  listContentContainer: {
    paddingBottom: 16,
  },
  numberText: {
    color: "black",
    fontWeight: "600",
  },
  numberTextContainer: {
    backgroundColor: "aliceblue",
    borderRadius: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryText: {
    color: "black",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  goTopButton: {
    backgroundColor: "dodgerblue",
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 13,
  },
  alreadyTopButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 32,
    paddingVertical: 4,
    paddingHorizontal: 13,
  },
  goTopText: {
    color: "white",
    fontWeight: "600",
  },
  sectionHeader: {
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "lightgray",
    flexDirection: "row",
    gap: 16,
    padding: 18,
    borderRadius: 12,
    marginTop: 8,
  },
  sectionItem: {
    backgroundColor: "white",
    borderColor: "lightgray",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  textSectionItem: {
    color: "black",
    fontSize: 16,
  },
  containerTextSectionItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loadMoreButton: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    marginRight: 12,
    paddingHorizontal: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  loadMoreText: {
    color: "royalblue",
    textDecorationLine: "underline",
    fontWeight: "600",
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    padding: 16,
  },
});

export { JokesList };
